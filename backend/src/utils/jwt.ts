import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type Role = 'salesperson' | 'admin';

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  name: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string; // jti, matched against the persisted RefreshToken document
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
