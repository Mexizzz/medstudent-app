import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createToken, verifyToken, COOKIE_NAME } from './jwt';

export { createToken, verifyToken };

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export class BannedError extends Error {
  bannedUntil: Date;
  reason: string | null;
  constructor(bannedUntil: Date, reason: string | null) {
    super('Banned');
    this.bannedUntil = bannedUntil;
    this.reason = reason;
  }
}

/**
 * Returns user record's ban state if currently banned. Used by login + requireAuth.
 * Cheap: indexed PK lookup, ~0.5ms.
 */
async function checkBan(userId: string): Promise<{ bannedUntil: Date; reason: string | null } | null> {
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { bannedUntil: true, banReason: true },
  });
  if (u?.bannedUntil && u.bannedUntil > new Date()) {
    return { bannedUntil: u.bannedUntil, reason: u.banReason ?? null };
  }
  return null;
}

export { checkBan };

/** Call at the top of any API route to get userId or throw 401/403 */
export async function requireAuth(): Promise<{ userId: string; email: string }> {
  const user = await getAuthUser();
  if (!user) throw new AuthError();
  const ban = await checkBan(user.userId);
  if (ban) throw new BannedError(ban.bannedUntil, ban.reason);
  return user;
}

export function authCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export function clearAuthCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

/** Wrap an API handler with auth check — catches AuthError/BannedError and returns 401/403 */
export function handleAuthError(error: unknown) {
  if (error instanceof BannedError) {
    return NextResponse.json({
      error: 'Account banned',
      reason: error.reason,
      bannedUntil: error.bannedUntil.toISOString(),
    }, { status: 403 });
  }
  if (error instanceof AuthError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  throw error;
}
