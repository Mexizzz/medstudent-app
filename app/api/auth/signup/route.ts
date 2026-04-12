import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { createToken, authCookieOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if email exists
    const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const id = nanoid();
    const passwordHash = await bcrypt.hash(password, 10);

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    db.insert(users).values({
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name?.trim() || null,
      subscriptionTier: 'max',
      subscriptionStatus: 'trial',
      subscriptionEndsAt: trialEndsAt,
      createdAt: new Date(),
    }).run();

    const token = await createToken(id, email);
    const res = NextResponse.json({ user: { id, email, name } });
    res.cookies.set(authCookieOptions(token));
    return res;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
