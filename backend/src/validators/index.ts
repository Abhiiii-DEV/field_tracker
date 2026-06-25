import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['salesperson', 'admin']).optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceInfo: z
    .object({
      os: z.string().optional(),
      osVersion: z.string().optional(),
      model: z.string().optional(),
      brand: z.string().optional(),
      batteryLevel: z.number().optional(),
      networkType: z.string().optional(),
    })
    .optional(),
  appVersion: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const logoutSchema = z.object({
  sessionId: z.string().optional(),
});

const pointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(400).optional(),
  accuracy: z.number().min(0).optional(),
  timestamp: z.union([z.string(), z.number()]),
  clientId: z.string().max(80).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

export const ingestSchema = z.object({
  points: z.array(pointSchema).min(1).max(500),
});

export const trackingEventSchema = z.object({
  type: z.enum(['GPS_DISABLED', 'PERMISSION_REVOKED', 'TRACKING_INTERRUPTED']),
  message: z.string().optional(),
});

export const fcmTokenSchema = z.object({
  token: z.string().min(10),
});

export const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const officeUpdateSchema = z.object({
  officeName: z.string().min(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(50).max(20000).optional(),
});

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['salesperson', 'admin']).default('salesperson'),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['salesperson', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
});
