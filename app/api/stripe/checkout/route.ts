import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await requireAuth();
    const { plan, interval } = await req.json();

    const priceKey = `${plan}_${interval}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    // Get or create Stripe customer
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/pricing?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: { userId, plan, interval },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
