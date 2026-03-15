import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createCheckout } from '@/lib/whop';
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
    const { plan, interval } = await req.json();

    const planKey = `${plan}_${interval}`;
    const envVar = PLAN_ENV_MAP[planKey];
    const planId = envVar ? process.env[envVar] : undefined;

    if (!planId) {
      console.error('Whop plan not found:', { planKey, envVar, value: planId, allEnv: Object.keys(process.env).filter(k => k.startsWith('WHOP')) });
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
