import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { createToken, authCookieOptions } from '@/lib/auth';
import { normalizeEmail } from '@/lib/email';
import { and, eq, gt, sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// Window during which we won't grant a second trial from the same IP.
const IP_TRIAL_THROTTLE_DAYS = 30;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const normalized = normalizeEmail(trimmedEmail);
    const ip = clientIp(req);

    // Block duplicate by both raw email and canonical form
    // (raw catches case-insensitive exact matches; normalized catches Gmail
    // dot/alias tricks and googlemail.com aliasing).
    const existing = db.select({ id: users.id })
      .from(users)
      .where(sql`${users.email} = ${trimmedEmail} OR ${users.normalizedEmail} = ${normalized}`)
      .get();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Trial throttle: if the same IP has already created an account within the
    // throttle window, the new signup still goes through but gets `free` tier
    // instead of `max trial`. Avoids the trick of "make a new account every
    // week from the same browser to keep getting Max."
    let grantTrial = true;
    if (ip !== 'unknown') {
      const cutoff = Math.floor((Date.now() - IP_TRIAL_THROTTLE_DAYS * 24 * 60 * 60 * 1000) / 1000);
      const recent = db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.signupIp, ip),
          gt(users.createdAt, new Date(cutoff * 1000)),
        ))
        .get();
      if (recent) grantTrial = false;
    }

    const id = nanoid();
    const passwordHash = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    db.insert(users).values({
      id,
      email: trimmedEmail,
      normalizedEmail: normalized,
      passwordHash,
      name: name?.trim() || null,
      subscriptionTier: grantTrial ? 'max' : 'free',
      subscriptionStatus: grantTrial ? 'trial' : 'active',
      subscriptionEndsAt: grantTrial ? trialEndsAt : null,
      signupIp: ip,
      createdAt: new Date(),
    }).run();

    const token = await createToken(id, trimmedEmail);
    const res = NextResponse.json({
      user: { id, email: trimmedEmail, name },
      trialGranted: grantTrial,
    });
    res.cookies.set(authCookieOptions(token));
    return res;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
