import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetCodes } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendResetCode } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Check user exists
    const user = db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).get();
    if (!user) {
      // Don't reveal if email exists — still return success
      return NextResponse.json({ success: true });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    db.insert(passwordResetCodes).values({
      id: nanoid(),
      email: normalizedEmail,
      code,
      expiresAt,
      used: false,
      createdAt: now,
    }).run();

    await sendResetCode(normalizedEmail, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}
