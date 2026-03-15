import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createCheckout, getWhopPlanIds, type WhopPlanKey } from '@/lib/whop';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const { plan, interval } = await req.json();

    const ids = getWhopPlanIds();
    const planKey = `${plan}_${interval}` as WhopPlanKey;
    const planId = ids[planKey];

    if (!planId) {
      console.error('Whop plan not found:', { planKey, plan, interval, ids });
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const url = await createCheckout(planId, userId, email, `${baseUrl}/pricing?success=true`);

    return NextResponse.json({ url });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Whop checkout error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
