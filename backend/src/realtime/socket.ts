import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { corsOrigins } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken, Role } from '../utils/jwt';

/**
 * Realtime gateway.
 *
 * Rooms:
 *   - "admins"            : every connected admin (broadcast target for live updates)
 *   - "employee:<userId>" : an individual salesperson (so an admin can subscribe
 *                           to a single employee's high-frequency stream on demand)
 *
 * Events emitted to admins:
 *   - location:update   live position/speed/status for one employee
 *   - employee:status   tracking/online status change
 *   - notification      new admin notification
 *   - stop:new          a stop/halt was detected
 *   - summary:update    a daily summary changed (dashboard cards refresh)
 */

export const ROOM_ADMINS = 'admins';
export const employeeRoom = (userId: string) => `employee:${userId}`;

interface SocketData {
  userId: string;
  role: Role;
  name: string;
}

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'], credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Authenticate every socket using the same JWT access token as the REST API.
  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization as string | undefined)?.replace(
          /^Bearer\s+/i,
          ''
        );
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = verifyAccessToken(token);
      (socket.data as SocketData) = {
        userId: payload.sub,
        role: payload.role,
        name: payload.name,
      };
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data as SocketData;

    if (role === 'admin') {
      socket.join(ROOM_ADMINS);
    } else {
      socket.join(employeeRoom(userId));
    }
    logger.debug({ userId, role, sid: socket.id }, 'socket connected');

    // An admin can focus on one employee's live stream.
    socket.on('subscribe:employee', (targetUserId: string) => {
      if (role === 'admin' && typeof targetUserId === 'string') {
        socket.join(employeeRoom(targetUserId));
      }
    });
    socket.on('unsubscribe:employee', (targetUserId: string) => {
      if (role === 'admin' && typeof targetUserId === 'string') {
        socket.leave(employeeRoom(targetUserId));
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, sid: socket.id, reason }, 'socket disconnected');
    });
  });

  logger.info('Socket.IO gateway initialised');
  return io;
}

function emit(event: string, payload: unknown, rooms: string[]) {
  if (!io) return;
  let chan = io.to(rooms[0]);
  for (const r of rooms.slice(1)) chan = chan.to(r);
  chan.emit(event, payload);
}

/** Live position update for a single employee → admins + per-employee room. */
export const emitLocationUpdate = (userId: string, payload: unknown) =>
  emit('location:update', payload, [ROOM_ADMINS, employeeRoom(userId)]);

export const emitEmployeeStatus = (userId: string, payload: unknown) =>
  emit('employee:status', payload, [ROOM_ADMINS, employeeRoom(userId)]);

export const emitNotification = (payload: unknown) =>
  emit('notification', payload, [ROOM_ADMINS]);

export const emitStopNew = (userId: string, payload: unknown) =>
  emit('stop:new', payload, [ROOM_ADMINS, employeeRoom(userId)]);

export const emitSummaryUpdate = (userId: string, payload: unknown) =>
  emit('summary:update', payload, [ROOM_ADMINS, employeeRoom(userId)]);

export const getIo = (): SocketIOServer | null => io;
