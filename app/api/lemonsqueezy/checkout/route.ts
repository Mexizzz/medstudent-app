import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { createCheckout, LS_VARIANT_IDS } from '@/lib/lemonsqueezy';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const { plan, interval } = await req.json();

    const variantKey = `${plan}_${interval}` as keyof typeof LS_VARIANT_IDS;
    const variantId = LS_VARIANT_IDS[variantKey];

    if (!variantId) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const url = await createCheckout(variantId, userId, email, `${baseUrl}/pricing?success=true`);

    return NextResponse.json({ url });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('LemonSqueezy checkout error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
