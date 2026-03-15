import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPayPalWebhookSignature, getPayPalSubscription, getPayPalPlanFromId } from '@/lib/paypal';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const headers: Record<string, string> = {};
  for (const key of ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']) {
    headers[key] = req.headers.get(key) || '';
  }

  try {
    const isValid = await verifyPayPalWebhookSignature(headers, body);
    if (!isValid) {
      console.error('PayPal webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    console.error('PayPal webhook verification error:', err);
    // In development, continue processing even if verification fails
    if (process.env.PAYPAL_MODE === 'live') {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  }

  const event = JSON.parse(body);
  const eventType = event.event_type;
  const resource = event.resource;

  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const subscriptionId = resource.id;
      const customId = resource.custom_id; // userId
      const planId = resource.plan_id;

      if (customId && planId) {
        const plan = getPayPalPlanFromId(planId);
        if (plan) {
          await db.update(users).set({
            subscriptionTier: plan.tier,
            subscriptionStatus: 'active',
            stripeSubscriptionId: `paypal_${subscriptionId}`,
          }).where(eq(users.id, customId));
        }
      }
      break;
    }

    case 'BILLING.SUBSCRIPTION.UPDATED': {
      const subscriptionId = resource.id;
      const customId = resource.custom_id;
      const planId = resource.plan_id;
      const status = resource.status;

      if (customId) {
        const plan = planId ? getPayPalPlanFromId(planId) : null;
        await db.update(users).set({
          subscriptionTier: plan?.tier ?? 'free',
          subscriptionStatus: status === 'ACTIVE' ? 'active' : status === 'SUSPENDED' ? 'past_due' : 'canceled',
        }).where(eq(users.id, customId));
      }
      break;
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      const customId = resource.custom_id;

      if (customId) {
        const newStatus = eventType.includes('SUSPENDED') ? 'past_due' : 'canceled';
        const newTier = eventType.includes('SUSPENDED') ? undefined : 'free';

        await db.update(users).set({
          ...(newTier && { subscriptionTier: newTier }),
          subscriptionStatus: newStatus,
        }).where(eq(users.id, customId));
      }
      break;
    }

    case 'PAYMENT.SALE.COMPLETED': {
      // Recurring payment succeeded — ensure user stays active
      const billingAgreementId = resource.billing_agreement_id;
      if (billingAgreementId) {
        try {
          const sub = await getPayPalSubscription(billingAgreementId);
          const customId = sub.custom_id;
          if (customId) {
            await db.update(users).set({
              subscriptionStatus: 'active',
            }).where(eq(users.id, customId));
          }
        } catch (err) {
          console.error('PayPal get subscription on payment:', err);
        }
      }
      break;
    }

    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      const customId = resource.custom_id;
      if (customId) {
        await db.update(users).set({
          subscriptionStatus: 'past_due',
        }).where(eq(users.id, customId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
