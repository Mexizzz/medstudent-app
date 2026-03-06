import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetCodes } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    // Find valid, unused code
    const resetCode = db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.email, normalizedEmail),
          eq(passwordResetCodes.code, code),
          eq(passwordResetCodes.used, false),
          gt(passwordResetCodes.expiresAt, now)
        )
      )
      .get();

    if (!resetCode) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Mark code as used
    db.update(passwordResetCodes)
      .set({ used: true })
      .where(eq(passwordResetCodes.id, resetCode.id))
      .run();

    // Update password
    const hash = await bcrypt.hash(newPassword, 10);
    db.update(users)
      .set({ passwordHash: hash })
      .where(eq(users.email, normalizedEmail))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
