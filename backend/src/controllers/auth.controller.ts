import { Request, Response } from 'express';
import { asyncHandler } from '../utils/AppError';
import * as authService from '../services/auth.service';
import { User } from '../models';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'],
  });
  res.json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken, req.headers['user-agent']);
  res.json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.logout({
    userId: req.auth!.sub,
    sessionId: req.body?.sessionId,
  });
  res.json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth!.sub).lean();
  res.json({ user: user ? { ...user, _id: String(user._id) } : null });
});
