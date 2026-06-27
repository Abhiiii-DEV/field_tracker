import { Request, Response } from 'express';
import { asyncHandler } from '../utils/AppError';
import * as admin from '../services/admin.service';
import * as office from '../services/office.service';
import * as notifications from '../services/notification.service';
import { localDateKey } from '../services/analytics.service';

// Optional report time-window bound: accept only well-formed "HH:mm", else ignore.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const qTime = (v: unknown): string | undefined =>
  typeof v === 'string' && TIME_RE.test(v) ? v : undefined;

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await admin.getDashboardOverview());
});

export const employees = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ employees: await admin.getEmployeeList() });
});

export const employeeDetail = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string) || localDateKey();
  res.json(
    await admin.getEmployeeDetail(req.params.id, date, qTime(req.query.from), qTime(req.query.to))
  );
});

export const employeeMap = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string) || localDateKey();
  res.json(
    await admin.getEmployeeMap(req.params.id, date, qTime(req.query.from), qTime(req.query.to))
  );
});

export const employeeTimeline = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string) || localDateKey();
  res.json(
    await admin.getEmployeeTimeline(req.params.id, date, qTime(req.query.from), qTime(req.query.to))
  );
});

// Office
export const listOffices = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ offices: await office.listOffices() });
});

export const updateOffice = asyncHandler(async (req: Request, res: Response) => {
  res.json({ office: await office.updateOffice(req.params.id, req.body) });
});

// Notifications
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const skip = Number(req.query.skip ?? 0);
  res.json(await notifications.listNotifications({ unreadOnly, limit, skip }));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notifications.markRead(req.body.ids);
  res.json({ ok: true });
});

export const markAllRead = asyncHandler(async (_req: Request, res: Response) => {
  await notifications.markAllRead();
  res.json({ ok: true });
});
