import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getPlanFromWhopPlanId, getMembership } from '@/lib/whop';
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

  // TEMP DIAGNOSTIC — find the correct secret + signing method, then remove.
  try {
    const crypto = await import('crypto');
    const webhookId = req.headers.get('webhook-id') || '';
    const webhookTs = req.headers.get('webhook-timestamp') || '';
    const recv = (signature.includes(',') ? signature.split(',')[1] : signature).trim();
    const candidates: Record<string, string> = {
      ebae: 'ws_ebae788e5fbbf4cd7de96776be353b05569ebed761513cb98925397a460ed4c0',
      e87f: 'ws_e87f156b71ad5d855134d0b6b29d55bd1b6195c3a83beee6dc952683468da72e',
    };
    const methods: Record<string, string> = {
      bodyOnly: rawBody,
      stdWebhooks: `${webhookId}.${webhookTs}.${rawBody}`,
    };
    const hits: string[] = [];
    for (const [sk, secret] of Object.entries(candidates)) {
      // Standard Webhooks signs with the base64-decoded secret (after whsec_/ws_ prefix)
      const rawSecret = secret.replace(/^ws_/, '').replace(/^whsec_/, '');
      const keyVariants: Record<string, Buffer> = {
        utf8: Buffer.from(secret),
        utf8NoPrefix: Buffer.from(rawSecret),
        b64NoPrefix: (() => { try { return Buffer.from(rawSecret, 'base64'); } catch { return Buffer.from(''); } })(),
      };
      for (const [kk, keyBuf] of Object.entries(keyVariants)) {
        for (const [mk, msg] of Object.entries(methods)) {
          const h = crypto.createHmac('sha256', keyBuf).update(msg).digest('base64');
          if (h === recv) hits.push(`${sk}/${kk}/${mk}`);
        }
      }
    }
    console.log('WH_DIAG', JSON.stringify({
      hasId: !!webhookId, hasTs: !!webhookTs,
      sigHeaderSample: signature.slice(0, 24),
      recvSample: recv.slice(0, 16),
      hits,
    }));
  } catch (e) {
    console.log('WH_DIAG error', (e as Error).message);
  }

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
            "webhook-signature": signature,
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
