import crypto from 'crypto';

const WHOP_API = 'https://api.whop.com/api/v1';

export function getWhopPlanIds() {
  return {
    pro_monthly: process.env.WHOP_PRO_MONTHLY_PLAN_ID || '',
    pro_annual: process.env.WHOP_PRO_ANNUAL_PLAN_ID || '',
    max_monthly: process.env.WHOP_MAX_MONTHLY_PLAN_ID || '',
    max_annual: process.env.WHOP_MAX_ANNUAL_PLAN_ID || '',
  };
}

export type WhopPlanKey = 'pro_monthly' | 'pro_annual' | 'max_monthly' | 'max_annual';

export function getPlanFromWhopPlanId(planId: string): { tier: 'pro' | 'max'; interval: 'monthly' | 'annual' } | null {
  const ids = getWhopPlanIds();
  if (planId === ids.pro_monthly) return { tier: 'pro', interval: 'monthly' };
  if (planId === ids.pro_annual) return { tier: 'pro', interval: 'annual' };
  if (planId === ids.max_monthly) return { tier: 'max', interval: 'monthly' };
  if (planId === ids.max_annual) return { tier: 'max', interval: 'annual' };
  return null;
}

function getApiKey(): string {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new Error('WHOP_API_KEY is not set');
  return key;
}

export async function createCheckout(planId: string, userId: string, userEmail: string, redirectUrl: string): Promise<string> {
  const res = await fetch(`${WHOP_API}/checkout_configurations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'payment',
      plan_id: planId,
      metadata: { user_id: userId, email: userEmail },
      redirect_url: redirectUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop checkout failed: ${text}`);
  }

  const data = await res.json();
  const purchaseUrl = data.purchase_url;

  if (!purchaseUrl) {
    throw new Error('No purchase URL returned from Whop');
  }

  // purchase_url may be relative, make it absolute
  if (purchaseUrl.startsWith('http')) return purchaseUrl;
  return `https://whop.com${purchaseUrl}`;
}

export interface WhopMembership {
  id: string;
  planId: string;
  status: string;
  expiresAt: number | null;
  email: string | null;
  metadataUserId: string | null;
}

function mapMembership(data: Record<string, unknown>, fallbackId: string): WhopMembership {
  const user = data.user as Record<string, unknown> | undefined;
  const plan = data.plan as Record<string, unknown> | undefined;
  const metadata = data.metadata as Record<string, unknown> | undefined;
  return {
    id: (data.id as string) ?? fallbackId,
    planId: (data.plan_id as string) ?? (plan?.id as string) ?? '',
    status: (data.status as string) ?? 'unknown',
    expiresAt: (data.expires_at as number) ?? (data.renewal_period_end as number) ?? null,
    email: (data.email as string) ?? (user?.email as string) ?? null,
    metadataUserId: (metadata?.user_id as string) ?? null,
  };
}

export async function getMembership(membershipId: string): Promise<WhopMembership> {
  const id = membershipId.replace(/^whop_/, '').trim();
  // Try v2 first (current), then v5, then v1 (legacy). Whop has been migrating accounts.
  const bases = [
    'https://api.whop.com/api/v2',
    'https://api.whop.com/api/v5',
    'https://api.whop.com/api/v1',
  ];
  const errors: string[] = [];
  for (const base of bases) {
    const res = await fetch(`${base}/memberships/${id}`, {
      headers: { 'Authorization': `Bearer ${getApiKey()}` },
    });
    if (res.ok) {
      const data = await res.json();
      return mapMembership(data, id);
    }
    const text = await res.text().catch(() => '');
    errors.push(`${base.split('/').pop()}: ${res.status} ${text.slice(0, 120)}`);
    // Auth failure on one version means key is bad — no point trying others
    if (res.status === 401 || res.status === 403) break;
  }
  throw new Error(`Whop fetch membership failed for ${id}. Tried: ${errors.join(' | ')}`);
}

export async function findMembershipsByEmail(email: string): Promise<WhopMembership[]> {
  const e = email.trim().toLowerCase();
  const bases = [
    'https://api.whop.com/api/v2',
    'https://api.whop.com/api/v5',
    'https://api.whop.com/api/v1',
  ];
  for (const base of bases) {
    const res = await fetch(`${base}/memberships?email=${encodeURIComponent(e)}`, {
      headers: { 'Authorization': `Bearer ${getApiKey()}` },
    });
    if (!res.ok) continue;
    const json = await res.json();
    const list = (json.data ?? json.memberships ?? []) as Record<string, unknown>[];
    if (list.length === 0) continue;
    return list.map(m => mapMembership(m, (m.id as string) ?? ''));
  }
  return [];
}

export async function cancelSubscription(membershipId: string, immediate = false): Promise<void> {
  const res = await fetch(`${WHOP_API}/memberships/${membershipId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancellation_mode: immediate ? 'immediate' : 'at_period_end',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop cancel failed: ${text}`);
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) throw new Error('WHOP_WEBHOOK_SECRET is not set');

  // Whop uses Standard Webhooks spec: "v1,BASE64_SIGNATURE"
  const parts = signature.split(',');
  const sigBase64 = parts.length > 1 ? parts[1] : parts[0];

  const hmac = crypto.createHmac('sha256', secret);
  const expectedSig = hmac.update(rawBody).digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigBase64, 'base64'),
      Buffer.from(expectedSig, 'base64'),
    );
  } catch {
    return false;
  }
}
