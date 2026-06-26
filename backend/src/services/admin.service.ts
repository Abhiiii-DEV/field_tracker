import { Types } from 'mongoose';
import { User, LiveState, Stop, Session, DailySummary, Notification } from '../models';
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

/** High-level counts for the dashboard overview cards. Reads LiveState only. */
export async function getDashboardOverview() {
  const staleBefore = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);

  const [totalEmployees, states] = await Promise.all([
    User.countDocuments({ role: 'salesperson', isActive: true }),
    LiveState.find()
      .populate({ path: 'userId', select: 'name role isActive' })
      .lean(),
  ]);

  let active = 0;
  let online = 0;
  let offline = 0;
  let insideOffice = 0;
  let outsideOffice = 0;
  let moving = 0;
  let stopped = 0;

  for (const s of states) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = s.userId as any;
    if (!u || u.role !== 'salesperson' || !u.isActive) continue;

    const isOnline = s.isOnline && s.lastSeenAt && new Date(s.lastSeenAt) >= staleBefore;
    if (s.trackingStatus === 'ACTIVE') active += 1;
    if (isOnline) online += 1;
    else offline += 1;
    if (s.locationStatus === 'INSIDE_OFFICE') insideOffice += 1;
    else if (s.locationStatus === 'OUTSIDE_OFFICE') outsideOffice += 1;
    if (isOnline && s.isMoving) moving += 1;
    else if (isOnline) stopped += 1;
  }

  return {
    totalEmployees,
    activeEmployees: active,
    onlineEmployees: online,
    offlineEmployees: offline,
    insideOffice,
    outsideOffice,
    moving,
    stopped,
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
export async function getEmployeeDetail(userId: string, date = localDateKey()) {
  const user = await User.findById(userId).select('name email phone role').lean();
  if (!user || user.role !== 'salesperson') throw AppError.notFound('Employee not found');

  const staleBefore = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);
  const [state, summary, stops] = await Promise.all([
    LiveState.findOne({ userId: new Types.ObjectId(userId) }).lean(),
    ensureDailySummary(userId, date),
    getStopsForDay(userId, date),
  ]);

  const isOnline = !!(
    state?.isOnline &&
    state.lastSeenAt &&
    new Date(state.lastSeenAt) >= staleBefore
  );

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
    today: {
      date,
      distanceTravelledKm: round2(summary.distanceTravelledKm),
      travelMinutes: Math.round(summary.travelMinutes),
      leftOfficeAt: summary.leftOfficeAt,
      returnedOfficeAt: summary.returnedOfficeAt,
      stopCount: summary.stopCount,
      stopDurationMinutes: Math.round(summary.stopDurationMinutes),
      totalLocationPoints: summary.totalLocationPoints,
    },
    stops,
  };
}

/** Map payload: office geofence, current position, route polyline, stops. */
export async function getEmployeeMap(userId: string, date = localDateKey()) {
  const dayStart = startOfLocalDay(date);
  const dayEnd = endOfLocalDay(date);
  const [office, state, route, stops, summary] = await Promise.all([
    getActiveOffice(),
    LiveState.findOne({ userId: new Types.ObjectId(userId) }).lean(),
    getRoute(userId, dayStart, dayEnd),
    getStopsForDay(userId, date),
    ensureDailySummary(userId, date),
  ]);

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
  let routePolyline = rawLatLng;
  if (summary.snappedRoute?.length && summary.snappedRouteCount === routePoints.length) {
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
export async function getEmployeeTimeline(userId: string, date = localDateKey()) {
  const dayStart = startOfLocalDay(date);
  const dayEnd = endOfLocalDay(date);

  const [summary, stops, sessions, notifications] = await Promise.all([
    ensureDailySummary(userId, date),
    getStopsForDay(userId, date),
    Session.find({
      userId: new Types.ObjectId(userId),
      loginTime: { $gte: dayStart, $lte: dayEnd },
    })
      .sort({ loginTime: 1 })
      .lean(),
    Notification.find({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: dayStart, $lte: dayEnd },
      type: { $in: ['LEFT_OFFICE', 'RETURNED_OFFICE'] },
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

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
