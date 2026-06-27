import { Types } from 'mongoose';
import { User, LiveState, Session, DailySummary, Notification } from '../models';
import { env } from '../config/env';
import {
  ensureDailySummary,
  localDateKey,
  getStopsForDay,
  getRoute,
  round2,
} from './analytics.service';
import { getActiveOffice } from './office.service';
import { AppError } from '../utils/AppError';
import { snapToRoads } from '../utils/roads';
import { haversineMeters } from '../utils/geo';

/**
 * High-level counts for the dashboard overview cards.
 *
 * We iterate over the full field-user list (not LiveState) so users who were
 * created but have never logged in — and therefore have no LiveState — are still
 * counted (as offline). Each count is decided by its own explicit per-user rule.
 */
export async function getDashboardOverview() {
  const staleBefore = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);

  const users = await User.find({ role: 'salesperson', isActive: true })
    .select('_id')
    .lean();

  const states = await LiveState.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();
  const stateByUser = new Map(states.map((s) => [String(s.userId), s]));

  let active = 0;
  let online = 0;
  let offline = 0;
  let atOffice = 0;
  let inField = 0;

  for (const u of users) {
    const s = stateByUser.get(String(u._id));

    if (s?.trackingStatus === 'ACTIVE') active += 1;

    // ONLINE: logged in, tracking active, a fresh ping, and a real GPS fix.
    const isOnline = !!(
      s &&
      s.trackingStatus === 'ACTIVE' &&
      s.isOnline === true &&
      s.lastSeenAt &&
      new Date(s.lastSeenAt) >= staleBefore &&
      s.locationStatus !== 'UNKNOWN'
    );

    if (isOnline) {
      online += 1;
      // AT OFFICE / IN FIELD only apply to online users (known current position).
      if (s!.locationStatus === 'INSIDE_OFFICE') atOffice += 1;
      else if (s!.locationStatus === 'OUTSIDE_OFFICE') inField += 1;
    } else {
      // OFFLINE: no LiveState (never completed login), logged out (INACTIVE),
      // isOnline=false, stale lastSeenAt (GPS off / network / >5 missed pings),
      // or no GPS fix yet (UNKNOWN).
      offline += 1;
    }
  }

  return {
    totalEmployees: users.length,
    activeEmployees: active,
    onlineEmployees: online,
    offlineEmployees: offline,
    insideOffice: atOffice,
    outsideOffice: inField,
  };
}

/** Employee cards for the list view. */
export async function getEmployeeList() {
  const staleBefore = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);
  const users = await User.find({ role: 'salesperson', isActive: true })
    .select('name email phone')
    .lean();

  const states = await LiveState.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();
  const stateByUser = new Map(states.map((s) => [String(s.userId), s]));

  const today = localDateKey();
  const summaries = await DailySummary.find({
    userId: { $in: users.map((u) => u._id) },
    date: today,
  }).lean();
  const sumByUser = new Map(summaries.map((s) => [String(s.userId), s]));

  return users.map((u) => {
    const s = stateByUser.get(String(u._id));
    const sum = sumByUser.get(String(u._id));
    const isOnline = !!(s?.isOnline && s.lastSeenAt && new Date(s.lastSeenAt) >= staleBefore);
    return {
      _id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      trackingStatus: s?.trackingStatus ?? 'INACTIVE',
      isOnline,
      currentSpeed: s?.speed ?? 0,
      locationStatus: s?.locationStatus ?? 'UNKNOWN',
      currentLocation:
        s?.latitude != null ? { latitude: s.latitude, longitude: s.longitude } : null,
      lastSeenAt: s?.lastSeenAt ?? null,
      distanceTravelledKm: round2(sum?.distanceTravelledKm ?? 0),
      batteryLevel: s?.batteryLevel ?? null,
    };
  });
}

/** Full detail for one employee (detail screen). */
export async function getEmployeeDetail(
  userId: string,
  date = localDateKey(),
  from?: string,
  to?: string
) {
  const user = await User.findById(userId).select('name email phone role').lean();
  if (!user || user.role !== 'salesperson') throw AppError.notFound('Employee not found');

  const { start, end, windowed } = resolveWindow(date, from, to);

  const staleBefore = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);
  const [state, summary, dayStops] = await Promise.all([
    LiveState.findOne({ userId: new Types.ObjectId(userId) }).lean(),
    ensureDailySummary(userId, date),
    getStopsForDay(userId, date),
  ]);

  const isOnline = !!(
    state?.isOnline &&
    state.lastSeenAt &&
    new Date(state.lastSeenAt) >= staleBefore
  );

  // When a time window is selected, recompute stats + stops for that window from
  // raw GPS points; otherwise use the cached whole-day DailySummary as before.
  const stops = windowed ? stopsInWindow(dayStops, start, end) : dayStops;
  const today = windowed
    ? await computeWindowStats(userId, date, start, end, dayStops)
    : {
        date,
        distanceTravelledKm: round2(summary.distanceTravelledKm),
        travelMinutes: Math.round(summary.travelMinutes),
        leftOfficeAt: summary.leftOfficeAt,
        returnedOfficeAt: summary.returnedOfficeAt,
        stopCount: summary.stopCount,
        stopDurationMinutes: Math.round(summary.stopDurationMinutes),
        totalLocationPoints: summary.totalLocationPoints,
      };

  return {
    user: { _id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? null },
    live: {
      currentLocation:
        state?.latitude != null
          ? { latitude: state.latitude, longitude: state.longitude }
          : null,
      currentSpeed: state?.speed ?? 0,
      isMoving: state?.isMoving ?? false,
      locationStatus: state?.locationStatus ?? 'UNKNOWN',
      trackingStatus: state?.trackingStatus ?? 'INACTIVE',
      isOnline,
      lastSeenAt: state?.lastSeenAt ?? null,
      batteryLevel: state?.batteryLevel ?? null,
    },
    today,
    stops,
  };
}

/** Map payload: office geofence, current position, route polyline, stops. */
export async function getEmployeeMap(
  userId: string,
  date = localDateKey(),
  from?: string,
  to?: string
) {
  const { start, end, windowed } = resolveWindow(date, from, to);
  const [office, state, route, dayStops, summary] = await Promise.all([
    getActiveOffice(),
    LiveState.findOne({ userId: new Types.ObjectId(userId) }).lean(),
    getRoute(userId, start, end),
    getStopsForDay(userId, date),
    ensureDailySummary(userId, date),
  ]);

  const stops = windowed ? stopsInWindow(dayStops, start, end) : dayStops;

  const routePoints = route.map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    timestamp: r.timestamp,
  }));
  const rawLatLng = routePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  // Road-snapped polyline for drawing, with a lazy per-day cache:
  //  • cache hit  → the snapped route built from this exact point count is reused (no API call)
  //  • cache miss → snap now; if it genuinely succeeds, store it for next time
  //  • snap fails → fall back to raw points and DON'T cache (so a blocked key/quota
  //    error is retried on the next view rather than frozen as straight lines)
  // For a custom time window we snap fresh but never read/write the per-day cache,
  // so windowed views can't corrupt the cached full-day route.
  let routePolyline = rawLatLng;
  if (windowed) {
    const snapped = await snapToRoads(rawLatLng);
    if (snapped) routePolyline = snapped;
  } else if (summary.snappedRoute?.length && summary.snappedRouteCount === routePoints.length) {
    routePolyline = summary.snappedRoute.map((p) => ({
      latitude: p.latitude as number,
      longitude: p.longitude as number,
    }));
  } else {
    const snapped = await snapToRoads(rawLatLng);
    if (snapped) {
      routePolyline = snapped;
      summary.set('snappedRoute', snapped);
      summary.snappedRouteCount = routePoints.length;
      await summary.save();
    }
  }

  return {
    office: {
      name: office.officeName,
      latitude: office.latitude,
      longitude: office.longitude,
      radius: office.radius,
    },
    current:
      state?.latitude != null
        ? { latitude: state.latitude, longitude: state.longitude, speed: state.speed }
        : null,
    route: routePoints,
    routePolyline,
    stops,
  };
}

/** Activity timeline: login → left office → stops/movement → returned → logout. */
export async function getEmployeeTimeline(
  userId: string,
  date = localDateKey(),
  from?: string,
  to?: string
) {
  const { start, end, windowed } = resolveWindow(date, from, to);

  const [summary, dayStops, sessions, notifications] = await Promise.all([
    ensureDailySummary(userId, date),
    getStopsForDay(userId, date),
    Session.find({
      userId: new Types.ObjectId(userId),
      loginTime: { $gte: start, $lte: end },
    })
      .sort({ loginTime: 1 })
      .lean(),
    Notification.find({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: start, $lte: end },
      type: { $in: ['LEFT_OFFICE', 'RETURNED_OFFICE'] },
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const stops = windowed ? stopsInWindow(dayStops, start, end) : dayStops;

  type Event = { type: string; at: Date; label: string; meta?: unknown };
  const events: Event[] = [];

  for (const s of sessions) {
    events.push({ type: 'LOGIN', at: s.loginTime, label: 'Logged in' });
    if (s.logoutTime) events.push({ type: 'LOGOUT', at: s.logoutTime, label: 'Logged out' });
  }
  for (const n of notifications) {
    events.push({
      type: n.type,
      at: n.createdAt as Date,
      label: n.type === 'LEFT_OFFICE' ? 'Left office' : 'Returned to office',
    });
  }
  for (const st of stops) {
    events.push({
      type: 'STOP',
      at: st.startTime,
      label: `Stopped ${Math.round(st.durationMinutes)} min`,
      meta: {
        endTime: st.endTime,
        durationMinutes: st.durationMinutes,
        latitude: st.latitude,
        longitude: st.longitude,
        address: st.resolvedAddress,
      },
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return { date, summary, events };
}

function startOfLocalDay(date: string, offsetMinutes = 330): Date {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() - offsetMinutes * 60_000);
}
function endOfLocalDay(date: string, offsetMinutes = 330): Date {
  return new Date(new Date(`${date}T23:59:59.999Z`).getTime() - offsetMinutes * 60_000);
}

/** A local `date` + `HH:mm` clock time → absolute Date (same IST offset). */
function localDateTime(date: string, time: string, offsetMinutes = 330): Date {
  return new Date(new Date(`${date}T${time}:00.000Z`).getTime() - offsetMinutes * 60_000);
}

/**
 * Resolve the report window for a day. With no `from`/`to` it spans the whole
 * local day (unchanged behaviour); either bound present narrows it to that time.
 */
function resolveWindow(date: string, from?: string, to?: string) {
  const windowed = !!(from || to);
  const start = from ? localDateTime(date, from) : startOfLocalDay(date);
  const end = to ? localDateTime(date, to) : endOfLocalDay(date);
  return { start, end, windowed };
}

type DayStop = Awaited<ReturnType<typeof getStopsForDay>>[number];

/** Keep only stops that begin inside [start, end]. */
function stopsInWindow(stops: DayStop[], start: Date, end: Date): DayStop[] {
  return stops.filter((s) => {
    const t = new Date(s.startTime).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

/**
 * Recompute day stats for an arbitrary time window straight from raw GPS points
 * (the per-day DailySummary only covers a whole day, so it can't be sliced).
 *  • distance — sum of great-circle hops between consecutive in-window points
 *  • travel   — elapsed span of those points minus time spent stopped
 *  • stops    — stops starting inside the window
 *  • points   — count of GPS points in the window
 */
async function computeWindowStats(
  userId: string,
  date: string,
  start: Date,
  end: Date,
  dayStops: DayStop[]
) {
  const [route, officeEvents] = await Promise.all([
    getRoute(userId, start, end),
    Notification.find({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: start, $lte: end },
      type: { $in: ['LEFT_OFFICE', 'RETURNED_OFFICE'] },
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const stops = stopsInWindow(dayStops, start, end);
  const stopDurationMinutes = stops.reduce((acc, s) => acc + s.durationMinutes, 0);

  let distanceMeters = 0;
  for (let i = 1; i < route.length; i++) {
    distanceMeters += haversineMeters(route[i - 1], route[i]);
  }

  let travelMinutes = 0;
  if (route.length >= 2) {
    const spanMs =
      new Date(route[route.length - 1].timestamp).getTime() -
      new Date(route[0].timestamp).getTime();
    travelMinutes = Math.max(0, spanMs / 60_000 - stopDurationMinutes);
  }

  const left = officeEvents.find((e) => e.type === 'LEFT_OFFICE');
  const returned = [...officeEvents].reverse().find((e) => e.type === 'RETURNED_OFFICE');

  return {
    date,
    distanceTravelledKm: round2(distanceMeters / 1000),
    travelMinutes: Math.round(travelMinutes),
    leftOfficeAt: left ? (left.createdAt as Date) : null,
    returnedOfficeAt: returned ? (returned.createdAt as Date) : null,
    stopCount: stops.length,
    stopDurationMinutes: Math.round(stopDurationMinutes),
    totalLocationPoints: route.length,
  };
}
