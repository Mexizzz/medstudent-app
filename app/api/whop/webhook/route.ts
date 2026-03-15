import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getPlanFromWhopPlanId } from '@/lib/whop';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || req.headers.get('webhook-signature') || '';

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Whop webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    console.error('Whop webhook verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.type;
  const data = event.data;
  const metadata = data?.metadata || data?.checkout?.metadata || {};
  const userId: string | undefined = metadata.user_id;

  if (!userId) {
    console.error('Whop webhook: no user_id in metadata', eventType);
    return NextResponse.json({ received: true });
  }

  switch (eventType) {
    case 'membership.activated': {
      const planId = data?.plan_id || data?.plan?.id || '';
      const plan = planId ? getPlanFromWhopPlanId(planId) : null;

      if (plan) {
        await db.update(users).set({
          subscriptionTier: plan.tier,
          subscriptionStatus: 'active',
          stripeSubscriptionId: `whop_${data?.id || ''}`,
        }).where(eq(users.id, userId));
      }
      break;
    }

    case 'membership.deactivated': {
      await db.update(users).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
      }).where(eq(users.id, userId));
      break;
    }

    case 'payment.succeeded': {
      // Keep user active on successful payment
      await db.update(users).set({
        subscriptionStatus: 'active',
      }).where(eq(users.id, userId));
      break;
    }

    case 'payment.failed': {
      await db.update(users).set({
        subscriptionStatus: 'past_due',
      }).where(eq(users.id, userId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
