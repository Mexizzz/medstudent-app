import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createPayPalSubscription, PAYPAL_PLAN_IDS } from '@/lib/paypal';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { plan, interval } = await req.json();

    const planKey = `${plan}_${interval}` as keyof typeof PAYPAL_PLAN_IDS;
    const planId = PAYPAL_PLAN_IDS[planKey];

    if (!planId) {
      return NextResponse.json({ error: 'Invalid plan or interval, or PayPal plan not configured' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const subscription = await createPayPalSubscription(
      planId,
      userId,
      `${baseUrl}/pricing?paypal_success=true`,
      `${baseUrl}/pricing?canceled=true`,
    );

    const approveLink = subscription.links?.find((l: { rel: string; href: string }) => l.rel === 'approve');

    if (!approveLink) {
      return NextResponse.json({ error: 'No approval URL returned from PayPal' }, { status: 500 });
    }

    return NextResponse.json({ url: approveLink.href });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('PayPal checkout error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
