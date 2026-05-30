import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, creditTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getPlanFromWhopPlanId, getMembership } from '@/lib/whop';
import { getCreditsForPlanId, grantCredits } from '@/lib/credits';
export const dynamic = 'force-dynamic';

// Pull user_id and email from any of the paths Whop has used historically.
function extractIdentifiers(data: Record<string, unknown>): { userId: string | null; email: string | null; membershipId: string | null; planId: string | null } {
  const checkout = (data?.checkout ?? {}) as Record<string, unknown>;
  const membership = (data?.membership ?? {}) as Record<string, unknown>;
  const user = (data?.user ?? {}) as Record<string, unknown>;
  const metadata = (data?.metadata ?? checkout?.metadata ?? membership?.metadata ?? {}) as Record<string, unknown>;
  const userId = (metadata?.user_id as string) ?? null;
  const email = ((data?.email as string) ?? (user?.email as string) ?? (checkout?.email as string) ?? null)?.toLowerCase().trim() || null;
  const membershipId = (data?.id as string) ?? (membership?.id as string) ?? null;
  const planId = (data?.plan_id as string) ?? (membership?.plan_id as string) ?? null;
  return { userId, email, membershipId, planId };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') || req.headers.get('webhook-signature') || '';
  const webhookId = req.headers.get('webhook-id') || '';
  const webhookTimestamp = req.headers.get('webhook-timestamp') || '';

  try {
    if (!verifyWebhookSignature(rawBody, signature, webhookId, webhookTimestamp)) {
      console.error('Whop webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    console.error('Whop webhook verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.type;
  const data = event.data ?? {};

  // Shoof relay: events for the Shoof storefront carry `orderId` / `productId`
  // in metadata (MedStudy events use `user_id`). Forward the raw body and
  // signature so Shoof's HMAC check still passes, then return — these events
  // have no MedStudy user to resolve.
  {
    const checkout = (data?.checkout ?? {}) as Record<string, unknown>;
    const membership = (data?.membership ?? {}) as Record<string, unknown>;
    const metadata = (data?.metadata ?? checkout?.metadata ?? membership?.metadata ?? {}) as Record<string, unknown>;
    if (metadata?.orderId || metadata?.productId) {
      try {
        const relay = await fetch("https://www.shoof.store/api/webhook", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Forward all three Standard-Webhooks headers so Shoof can
            // reconstruct `${id}.${timestamp}.${body}` and verify the signature.
            "webhook-signature": signature,
            "webhook-id": webhookId,
            "webhook-timestamp": webhookTimestamp,
          },
          body: rawBody,
        });
        console.log(`Whop webhook: relayed to Shoof, status=${relay.status}, event=${eventType}`);
      } catch (err) {
        console.error("Whop webhook: Shoof relay failed", err);
      }
      return NextResponse.json({ received: true, relayed: "shoof" });
    }
  }

  const { userId: metaUserId, email, membershipId, planId } = extractIdentifiers(data);

  // Resolve our user: prefer metadata.user_id, fall back to email lookup.
  let resolvedUserId: string | null = metaUserId;
  if (!resolvedUserId && email) {
    const u = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
    resolvedUserId = u?.id ?? null;
    if (resolvedUserId) {
      console.warn(`Whop webhook: user_id missing from metadata, resolved via email ${email} -> ${resolvedUserId}`);
    }
  }

  if (!resolvedUserId) {
    console.error('Whop webhook: could not resolve user', { eventType, email, membershipId });
    return NextResponse.json({ received: true, warning: 'unresolved_user' });
  }

  switch (eventType) {
    case 'membership.activated':
    case 'payment.succeeded':
    case 'membership.updated':
    case 'membership.created': {
      // Try to use plan_id from the event; if missing, fetch the membership from Whop.
      let effectivePlanId = planId;
      let expiresAt: number | null = (data?.expires_at as number) ?? (data?.renewal_period_end as number) ?? null;
      let status = (data?.status as string)?.toLowerCase() ?? 'active';

      if ((!effectivePlanId || !expiresAt) && membershipId) {
        try {
          const m = await getMembership(membershipId);
          effectivePlanId = effectivePlanId || m.planId;
          expiresAt = expiresAt ?? m.expiresAt;
          status = (m.status || status).toLowerCase();
        } catch (e) {
          console.error('Whop webhook: failed to fetch membership detail', e);
        }
      }

      // Credit-pack purchase: deliver the credits, log with the Whop payment/
      // receipt ID for idempotency, then return. Skipping the subscription
      // path that follows because credit packs don't upgrade tier.
      if (effectivePlanId) {
        const packCredits = getCreditsForPlanId(effectivePlanId);
        if (packCredits) {
          const receiptId = (data?.id as string) ?? membershipId ?? `whop_${effectivePlanId}_${Date.now()}`;
          // Idempotency check: did we already deliver this payment?
          const already = await db.query.creditTransactions.findFirst({
            where: eq(creditTransactions.refId, receiptId),
            columns: { id: true },
          });
          if (already) {
            console.log(`Whop webhook: credits already delivered for receipt ${receiptId}`);
            return NextResponse.json({ received: true, duplicate: true });
          }
          const result = await grantCredits(resolvedUserId, packCredits, 'purchase:credits', receiptId);
          if ('error' in result) {
            console.error('Whop webhook: grantCredits failed', result.error);
            return NextResponse.json({ received: true, warning: 'grant_failed' });
          }
          console.log(`Whop webhook: ${eventType} -> user ${resolvedUserId} +${packCredits} credits (receipt ${receiptId})`);
          break; // exit the switch — don't fall through to sub logic.
        }
      }

      const plan = effectivePlanId ? getPlanFromWhopPlanId(effectivePlanId) : null;
      if (!plan) {
        console.error('Whop webhook: unknown plan_id', { eventType, planId: effectivePlanId, userId: resolvedUserId });
        return NextResponse.json({ received: true, warning: 'unknown_plan_id' });
      }

      const subscriptionStatus =
        status === 'cancelled' || status === 'canceled' || status === 'completed' || status === 'expired' ? 'canceled' :
        status === 'past_due' ? 'past_due' :
        'active';

      const finalTier = subscriptionStatus === 'canceled' ? 'free' : plan.tier;

      await db.update(users).set({
        subscriptionTier: finalTier,
        subscriptionStatus,
        stripeSubscriptionId: membershipId ? `whop_${membershipId}` : undefined,
        subscriptionEndsAt: expiresAt ? new Date(expiresAt * 1000) : null,
      }).where(eq(users.id, resolvedUserId));

      console.log(`Whop webhook: ${eventType} -> user ${resolvedUserId} tier=${finalTier} status=${subscriptionStatus}`);
      break;
    }

    case 'membership.deactivated':
    case 'membership.cancelled':
    case 'membership.canceled': {
      await db.update(users).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
      }).where(eq(users.id, resolvedUserId));
      console.log(`Whop webhook: ${eventType} -> user ${resolvedUserId} downgraded to free`);
      break;
    }

    case 'payment.failed': {
      await db.update(users).set({
        subscriptionStatus: 'past_due',
      }).where(eq(users.id, resolvedUserId));
      console.log(`Whop webhook: payment.failed -> user ${resolvedUserId} marked past_due`);
      break;
    }

    default:
      console.log(`Whop webhook: unhandled event ${eventType} for user ${resolvedUserId}`);
  }

  return NextResponse.json({ received: true });
}
