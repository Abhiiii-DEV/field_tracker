import { Request, Response } from 'express';
import { asyncHandler } from '../utils/AppError';
import * as users from '../services/users.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ users: await users.listUsers() });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await users.createUser(req.body);
  res.status(201).json({ user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await users.updateUser(req.params.id, req.body);
  res.json({ user });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await users.resetPassword(req.params.id, req.body.password);
  res.json({ ok: true });
});
