import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getCreditBalance, getCreditPacks, getRecentTransactions } from '@/lib/credits';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const [balance, transactions] = await Promise.all([
      getCreditBalance(userId),
      getRecentTransactions(userId, 20),
    ]);
    return NextResponse.json({
      balance,
      packs: getCreditPacks(),
      transactions,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Credits API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
