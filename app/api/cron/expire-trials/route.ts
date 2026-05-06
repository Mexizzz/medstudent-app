import { NextRequest, NextResponse } from 'next/server';
import { expireOldTrials } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

// Hit this from Railway cron (or any uptime monitor) to downgrade expired trials.
// Protected by CRON_SECRET — pass as ?secret=... or Authorization: Bearer <secret>.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const provided =
    req.nextUrl.searchParams.get('secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await expireOldTrials();
  return NextResponse.json({ ok: true, ...result });
}
