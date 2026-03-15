import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEndDate(sub: any): Date | null {
  const ts = sub.current_period_end ?? sub.ended_at;
  return ts ? new Date(ts * 1000) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSubStatus(sub: any): string {
  const s = sub.status;
  if (s === 'active') return 'active';
  if (s === 'past_due') return 'past_due';
  return 'canceled';
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : null;

        if (plan) {
          await db.update(users).set({
            subscriptionTier: plan.tier,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer as string,
            subscriptionStatus: 'active',
            subscriptionEndsAt: getEndDate(subscription),
          }).where(eq(users.id, userId));
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });

      if (user) {
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : null;

        await db.update(users).set({
          subscriptionTier: plan?.tier ?? 'free',
          subscriptionStatus: getSubStatus(subscription),
          subscriptionEndsAt: getEndDate(subscription),
        }).where(eq(users.id, user.id));
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });

      if (user) {
        await db.update(users).set({
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        }).where(eq(users.id, user.id));
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;

      const user = await db.query.users.findFirst({
        where: eq(users.stripeCustomerId, customerId),
      });

      if (user) {
        await db.update(users).set({
          subscriptionStatus: 'past_due',
        }).where(eq(users.id, user.id));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
