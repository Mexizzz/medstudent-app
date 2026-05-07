// Edge-safe JWT helpers — used by middleware (which runs in Edge runtime
// and can't import Node-only modules like better-sqlite3). lib/auth.ts
// re-exports from here for the Node side.
import { SignJWT, jwtVerify } from 'jose';

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

export const COOKIE_NAME = 'medstudy-token';

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}
