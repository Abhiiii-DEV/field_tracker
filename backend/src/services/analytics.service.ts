import { DailySummary, Stop, LocationLog } from '../models';
import { Types } from 'mongoose';

/** Local YYYY-MM-DD for a date in a fixed offset. Defaults to IST (+5:30). */
export function localDateKey(d: Date = new Date(), offsetMinutes = 330): string {
  const shifted = new Date(d.getTime() + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Fetch-or-create the daily summary doc for a user/day. */
export async function ensureDailySummary(userId: string, date: string) {
  return DailySummary.findOneAndUpdate(
    { userId: new Types.ObjectId(userId), date },
    { $setOnInsert: { userId: new Types.ObjectId(userId), date } },
    { new: true, upsert: true }
  );
}

export async function getTodaySummary(userId: string) {
  const date = localDateKey();
  return ensureDailySummary(userId, date);
}

interface RangeTotals {
  distanceTravelledKm: number;
  travelMinutes: number;
  stopCount: number;
  stopDurationMinutes: number;
  days: number;
}

/** Sum precomputed summaries over a date range (inclusive). Reads DailySummary only. */
export async function getRangeTotals(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<RangeTotals> {
  const rows = await DailySummary.aggregate<{
    _id: null;
    distanceTravelledKm: number;
    travelMinutes: number;
    stopCount: number;
    stopDurationMinutes: number;
    days: number;
  }>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        date: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: null,
        distanceTravelledKm: { $sum: '$distanceTravelledKm' },
        travelMinutes: { $sum: '$travelMinutes' },
        stopCount: { $sum: '$stopCount' },
        stopDurationMinutes: { $sum: '$stopDurationMinutes' },
        days: { $sum: 1 },
      },
    },
  ]);
  const r = rows[0];
  return {
    distanceTravelledKm: round2(r?.distanceTravelledKm ?? 0),
    travelMinutes: Math.round(r?.travelMinutes ?? 0),
    stopCount: r?.stopCount ?? 0,
    stopDurationMinutes: Math.round(r?.stopDurationMinutes ?? 0),
    days: r?.days ?? 0,
  };
}

/** Salesperson self-stats: today / this week / this month, all from DailySummary. */
export async function getSelfStats(userId: string) {
  const today = localDateKey();
  const now = new Date();

  const weekStart = new Date(now);
  const day = (weekStart.getDay() + 6) % 7; // Monday = 0
  weekStart.setDate(weekStart.getDate() - day);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayDoc, week, month] = await Promise.all([
    ensureDailySummary(userId, today),
    getRangeTotals(userId, localDateKey(weekStart), today),
    getRangeTotals(userId, localDateKey(monthStart), today),
  ]);

  return {
    today: {
      distanceTravelledKm: round2(todayDoc.distanceTravelledKm),
      travelMinutes: Math.round(todayDoc.travelMinutes),
      leftOfficeAt: todayDoc.leftOfficeAt,
      returnedOfficeAt: todayDoc.returnedOfficeAt,
      stopCount: todayDoc.stopCount,
      stopDurationMinutes: Math.round(todayDoc.stopDurationMinutes),
    },
    week: { distanceTravelledKm: week.distanceTravelledKm, travelMinutes: week.travelMinutes },
    month: { distanceTravelledKm: month.distanceTravelledKm, travelMinutes: month.travelMinutes },
  };
}

/** Stops for a user on a given day, ordered. */
export async function getStopsForDay(userId: string, date: string) {
  return Stop.find({ userId: new Types.ObjectId(userId), date }).sort({ startTime: 1 }).lean();
}

/** Raw route for replay — only place LocationLogs is read for the dashboard. */
export async function getRoute(userId: string, from: Date, to: Date, limit = 5000) {
  return LocationLog.find({
    userId: new Types.ObjectId(userId),
    timestamp: { $gte: from, $lte: to },
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .select('latitude longitude speed timestamp')
    .lean();
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
