import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createCheckout, WHOP_PLAN_IDS } from '@/lib/whop';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const { plan, interval } = await req.json();

    const planKey = `${plan}_${interval}` as keyof typeof WHOP_PLAN_IDS;
    const planId = WHOP_PLAN_IDS[planKey];

    if (!planId) {
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
