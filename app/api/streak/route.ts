import { NextResponse } from 'next/server';
import { getStreakInfo } from '@/lib/streak';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const info = await getStreakInfo(userId);
    return NextResponse.json(info);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
