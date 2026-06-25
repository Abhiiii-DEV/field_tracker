import crypto from 'crypto';
import { Types } from 'mongoose';
import { User, Session, RefreshToken, LiveState } from '../models';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  Role,
} from '../utils/jwt';
import { env } from '../config/env';
import { notifyAbout } from './notification.service';
import { emitEmployeeStatus } from '../realtime/socket';
import { parseDurationToMs } from '../utils/duration';

interface DeviceInfo {
  os?: string;
  osVersion?: string;
  model?: string;
  brand?: string;
  batteryLevel?: number;
  networkType?: string;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() }).lean();
  if (existing) throw AppError.conflict('A user with that email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role ?? 'salesperson',
    phone: input.phone,
  });
  return sanitize(user.toObject());
}

export async function login(input: {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
  appVersion?: string;
  userAgent?: string;
}) {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive) throw AppError.unauthorized('Invalid credentials');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw AppError.unauthorized('Invalid credentials');

  // Open a session.
  const session = await Session.create({
    userId: user._id,
    loginTime: new Date(),
    deviceInfo: input.deviceInfo ?? {},
    appVersion: input.appVersion,
  });

  // Mark live state active/online (salespeople).
  if (user.role === 'salesperson') {
    await LiveState.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          trackingStatus: 'ACTIVE',
          isOnline: true,
          lastSeenAt: new Date(),
          activeSessionId: session._id,
          locationStatus: 'UNKNOWN',
        },
        $setOnInsert: { userId: user._id },
      },
      { upsert: true, new: true }
    );
    await notifyAbout(
      String(user._id),
      'LOGIN',
      `logged in${input.deviceInfo?.model ? ` on ${input.deviceInfo.model}` : ''}`
    );
    emitEmployeeStatus(String(user._id), {
      userId: String(user._id),
      trackingStatus: 'ACTIVE',
      isOnline: true,
    });
  }

  const tokens = await issueTokens(String(user._id), user.role as Role, user.name, input.userAgent);

  return {
    user: sanitize(user.toObject()),
    session: { _id: String(session._id), loginTime: session.loginTime },
    ...tokens,
  };
}

export async function refresh(refreshTokenRaw: string, userAgent?: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw AppError.unauthorized('Invalid refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenId: payload.tokenId });
  if (!stored || stored.revoked) {
    // Possible reuse of a rotated/stolen token → revoke the whole chain.
    await RefreshToken.updateMany({ userId: payload.sub }, { $set: { revoked: true } });
    throw AppError.unauthorized('Refresh token revoked');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw AppError.unauthorized('User inactive');

  // Rotate: revoke the old, issue a fresh pair.
  const tokens = await issueTokens(
    String(user._id),
    user.role as Role,
    user.name,
    userAgent
  );
  stored.revoked = true;
  stored.replacedBy = tokens.refreshTokenId;
  await stored.save();

  return { ...tokens, user: sanitize(user.toObject()) };
}

export async function logout(input: {
  userId: string;
  sessionId?: string;
  refreshTokenId?: string;
}) {
  const now = new Date();

  if (input.sessionId) {
    await Session.updateOne(
      { _id: new Types.ObjectId(input.sessionId) },
      { $set: { logoutTime: now } }
    );
  }
  // Revoke all refresh tokens for this user (logout-everywhere semantics).
  await RefreshToken.updateMany({ userId: input.userId }, { $set: { revoked: true } });

  const user = await User.findById(input.userId).select('name role').lean();
  if (user?.role === 'salesperson') {
    await LiveState.updateOne(
      { userId: new Types.ObjectId(input.userId) },
      { $set: { trackingStatus: 'INACTIVE', isOnline: false, lastSeenAt: now } }
    );
    await notifyAbout(input.userId, 'LOGOUT', 'logged out — tracking stopped');
    emitEmployeeStatus(input.userId, {
      userId: input.userId,
      trackingStatus: 'INACTIVE',
      isOnline: false,
    });
  }

  return { loggedOutAt: now };
}

async function issueTokens(userId: string, role: Role, name: string, userAgent?: string) {
  const tokenId = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: userId, role, name });
  const refreshToken = signRefreshToken({ sub: userId, tokenId });

  await RefreshToken.create({
    userId,
    tokenId,
    userAgent,
    expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_TTL)),
  });

  return { accessToken, refreshToken, refreshTokenId: tokenId };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitize(u: any) {
  const { passwordHash, __v, ...rest } = u;
  return { ...rest, _id: String(rest._id) };
}
