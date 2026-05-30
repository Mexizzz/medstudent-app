import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createCheckout } from '@/lib/whop';
import { getCreditsForPlanId } from '@/lib/credits';
export const dynamic = 'force-dynamic';

const PLAN_ENV_MAP: Record<string, string> = {
  pro_monthly: 'WHOP_PRO_MONTHLY_PLAN_ID',
  pro_annual: 'WHOP_PRO_ANNUAL_PLAN_ID',
  max_monthly: 'WHOP_MAX_MONTHLY_PLAN_ID',
  max_annual: 'WHOP_MAX_ANNUAL_PLAN_ID',
};

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const body = await req.json();
    const { plan, interval, planId: rawPlanId } = body;

    let planId: string | undefined;

    // Two checkout paths:
    //   1) Subscription:  { plan: 'pro' | 'max', interval: 'monthly' | 'annual' }
    //   2) Credit pack:   { planId: 'plan_xxxxxxxxxxxx' }  (Whop plan id direct)
    if (rawPlanId && typeof rawPlanId === 'string') {
      // Sanity-check it's actually a known credit pack — prevents random
      // attackers POST-ing arbitrary plan IDs to bill people for unknown stuff.
      const credits = getCreditsForPlanId(rawPlanId);
      if (!credits) {
        return NextResponse.json({ error: 'Unknown credit pack' }, { status: 400 });
      }
      planId = rawPlanId;
    } else if (plan && interval) {
      const planKey = `${plan}_${interval}`;
      const envVar = PLAN_ENV_MAP[planKey];
      planId = envVar ? process.env[envVar] : undefined;
      if (!planId) {
        console.error('Whop plan not found:', { planKey, envVar });
        return NextResponse.json({
          error: `Checkout for ${plan?.toString().toUpperCase()} (${interval}) is temporarily unavailable. Please try the other interval or contact support.`,
          missingEnv: envVar,
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Missing plan/interval or planId' }, { status: 400 });
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
