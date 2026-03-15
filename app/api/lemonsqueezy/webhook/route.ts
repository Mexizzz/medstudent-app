import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getPlanFromVariantId } from '@/lib/lemonsqueezy';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || '';

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    console.error('LemonSqueezy webhook verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event.meta?.event_name;
  const customData = event.meta?.custom_data;
  const userId: string | undefined = customData?.user_id;
  const attrs = event.data?.attributes;

  if (!userId) {
    console.error('LemonSqueezy webhook: no user_id in custom data');
    return NextResponse.json({ received: true });
  }

  const variantId = String(attrs?.variant_id || attrs?.first_subscription_item?.variant_id || '');
  const plan = variantId ? getPlanFromVariantId(variantId) : null;
  const lsSubscriptionId = String(event.data?.id || '');

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated': {
      const status = attrs?.status; // active, past_due, paused, cancelled, expired
      let subStatus: string = 'active';
      let tier: string = plan?.tier ?? 'free';

      if (status === 'active' || status === 'on_trial') {
        subStatus = 'active';
      } else if (status === 'past_due' || status === 'paused') {
        subStatus = 'past_due';
      } else if (status === 'cancelled' || status === 'expired') {
        subStatus = 'canceled';
        tier = 'free';
      }

      const endsAt = attrs?.ends_at || attrs?.renews_at;

      await db.update(users).set({
        subscriptionTier: tier,
        subscriptionStatus: subStatus,
        stripeSubscriptionId: `ls_${lsSubscriptionId}`,
        subscriptionEndsAt: endsAt ? new Date(endsAt) : null,
      }).where(eq(users.id, userId));
      break;
    }

    case 'subscription_cancelled':
    case 'subscription_expired': {
      await db.update(users).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
      }).where(eq(users.id, userId));
      break;
    }

    case 'subscription_payment_success': {
      await db.update(users).set({
        subscriptionStatus: 'active',
      }).where(eq(users.id, userId));
      break;
    }

    case 'subscription_payment_failed': {
      await db.update(users).set({
        subscriptionStatus: 'past_due',
      }).where(eq(users.id, userId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
