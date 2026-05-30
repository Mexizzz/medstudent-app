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

export interface WhopPayment {
  id: string;
  planId: string;
  membershipId: string | null;
  status: string;
  amount: number | null;          // in major units (e.g. SAR, not halalas)
  currency: string | null;
  email: string | null;
  metadataUserId: string | null;
  createdAt: number | null;       // unix seconds
}

function mapPayment(data: Record<string, unknown>): WhopPayment {
  const user = data.user as Record<string, unknown> | undefined;
  const metadata = data.metadata as Record<string, unknown> | undefined;
  return {
    id: (data.id as string) ?? '',
    planId: (data.plan_id as string) ?? '',
    membershipId: (data.membership_id as string) ?? (data.membership as string) ?? null,
    status: (data.status as string) ?? 'unknown',
    amount: typeof data.amount === 'number'
      ? data.amount
      : typeof data.final_amount === 'number'
        ? data.final_amount
        : null,
    currency: (data.currency as string) ?? null,
    email: (data.email as string) ?? (user?.email as string) ?? null,
    metadataUserId: (metadata?.user_id as string) ?? null,
    createdAt: (data.created_at as number) ?? null,
  };
}

/**
 * Lists all successful Whop payments, paginating until exhausted.
 * Used by the admin importer to backfill credit deliveries for users
 * who paid before the credits feature shipped.
 *
 * Tries multiple endpoint paths because Whop accounts differ:
 *   /receipts (most current), /payments (legacy), across v2 / v5 / v1.
 */
export async function listPayments(opts?: { onlySuccessful?: boolean }): Promise<WhopPayment[]> {
  const onlySuccessful = opts?.onlySuccessful ?? true;
  // Try every combination of (version, resource) until one responds OK.
  const attempts: { base: string; resource: string }[] = [];
  for (const base of ['https://api.whop.com/api/v2', 'https://api.whop.com/api/v5', 'https://api.whop.com/api/v1']) {
    for (const resource of ['receipts', 'payments']) {
      attempts.push({ base, resource });
    }
  }

  let workingBase: string | null = null;
  let workingResource: string | null = null;
  let firstPage: Record<string, unknown> | null = null;
  const errors: string[] = [];

  for (const { base, resource } of attempts) {
    const url = `${base}/${resource}?per=100&page=1${onlySuccessful ? '&status=success' : ''}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getApiKey()}` } });
    if (res.ok) {
      workingBase = base;
      workingResource = resource;
      firstPage = await res.json();
      break;
    }
    if (res.status === 401 || res.status === 403) {
      const text = await res.text().catch(() => '');
      throw new Error(`Whop auth failed (${res.status}) at ${base.split('/').pop()}/${resource}: ${text.slice(0, 120)}. Check WHOP_API_KEY.`);
    }
    const text = await res.text().catch(() => '');
    errors.push(`${base.split('/').pop()}/${resource}: ${res.status} ${text.slice(0, 60)}`);
  }
  if (!workingBase || !workingResource || !firstPage) {
    throw new Error(`Whop payments lookup failed. Tried: ${errors.join(' | ')}`);
  }

  const all: WhopPayment[] = [];
  const extract = (page: Record<string, unknown>) => {
    const list = (page.data ?? page.payments ?? page.receipts ?? []) as Record<string, unknown>[];
    for (const p of list) all.push(mapPayment(p));
    const pagination = page.pagination as Record<string, unknown> | undefined;
    return (pagination?.total_pages as number) ?? (page.total_pages as number) ?? 1;
  };

  const totalPages = extract(firstPage);
  const PAGE_CAP = 50;
  for (let p = 2; p <= Math.min(totalPages, PAGE_CAP); p++) {
    const res = await fetch(
      `${workingBase}/${workingResource}?per=100&page=${p}${onlySuccessful ? '&status=success' : ''}`,
      { headers: { 'Authorization': `Bearer ${getApiKey()}` } },
    );
    if (!res.ok) break;
    extract(await res.json());
  }
  return all;
}

export interface WhopPlan {
  id: string;
  productId: string | null;
  productName: string | null;
  name: string | null;
  amount: number | null;            // major units (e.g. SAR, not halalas)
  currency: string | null;
  billingPeriod: string | null;     // 'monthly' / 'annual' / 'one-time' / null
  visibility: string | null;
  active: boolean | null;
}

function firstNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === 'number' && isFinite(v) && v >= 0) return v;
    if (typeof v === 'string' && v && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function mapPlan(data: Record<string, unknown>): WhopPlan {
  const product = data.product as Record<string, unknown> | undefined;
  const planType = (data.plan_type as string) ?? '';
  // Whop's plan shapes vary across API versions. Try every known price field;
  // some accounts use renewal_price/initial_price (objects with amount), some
  // use *_amount, some store prices on the product instead.
  const renewalObj = data.renewal_price as Record<string, unknown> | undefined;
  const initialObj = data.initial_price as Record<string, unknown> | undefined;
  const amount = firstNumber(
    typeof data.initial_price === 'number' ? data.initial_price : undefined,
    typeof data.renewal_price_amount === 'number' ? data.renewal_price_amount : undefined,
    typeof data.renewal_price === 'number' ? data.renewal_price : undefined,
    typeof data.price === 'number' ? data.price : undefined,
    typeof data.amount === 'number' ? data.amount : undefined,
    initialObj?.amount,
    renewalObj?.amount,
    product?.initial_price,
    product?.price,
  );

  const currency = (data.base_currency as string)
    ?? (data.currency as string)
    ?? (renewalObj?.currency as string)
    ?? (initialObj?.currency as string)
    ?? (product?.base_currency as string)
    ?? null;

  const isOneTimeByType = planType.includes('one_time') || planType.includes('onetime');
  const isOneTimeByPrice = (data.renewal_price_amount === 0 || data.renewal_price_amount == null)
    && (renewalObj?.amount === 0 || renewalObj?.amount == null)
    && data.initial_price !== undefined;
  const billingPeriod = isOneTimeByType || isOneTimeByPrice
    ? 'one-time'
    : (data.billing_period as string) ?? planType ?? null;

  return {
    id: (data.id as string) ?? '',
    productId: (data.product_id as string) ?? (product?.id as string) ?? null,
    productName: (product?.name as string) ?? (data.product_name as string) ?? null,
    name: (data.name as string) ?? planType ?? null,
    amount,
    currency,
    billingPeriod,
    visibility: (data.visibility as string) ?? null,
    active: (data.active as boolean) ?? null,
  };
}

/**
 * List every Whop plan on this account. Used by the admin panel so plan
 * IDs can be discovered without leaving the app.
 */
export async function listPlans(): Promise<WhopPlan[]> {
  const bases = [
    'https://api.whop.com/api/v2',
    'https://api.whop.com/api/v5',
    'https://api.whop.com/api/v1',
  ];

  let workingBase: string | null = null;
  let firstPage: Record<string, unknown> | null = null;
  for (const base of bases) {
    const res = await fetch(`${base}/plans?per=100&page=1`, {
      headers: { 'Authorization': `Bearer ${getApiKey()}` },
    });
    if (res.ok) { workingBase = base; firstPage = await res.json(); break; }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Whop auth failed listing plans (${res.status}). Check WHOP_API_KEY.`);
    }
  }
  if (!workingBase || !firstPage) throw new Error('Whop plans endpoint unreachable on all API versions tried.');

  const out: WhopPlan[] = [];
  const extract = (page: Record<string, unknown>) => {
    const list = (page.data ?? page.plans ?? []) as Record<string, unknown>[];
    for (const p of list) out.push(mapPlan(p));
    const pagination = page.pagination as Record<string, unknown> | undefined;
    return (pagination?.total_pages as number) ?? (page.total_pages as number) ?? 1;
  };

  const totalPages = extract(firstPage);
  for (let p = 2; p <= Math.min(totalPages, 20); p++) {
    const res = await fetch(`${workingBase}/plans?per=100&page=${p}`, {
      headers: { 'Authorization': `Bearer ${getApiKey()}` },
    });
    if (!res.ok) break;
    extract(await res.json());
  }
  return out;
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

export function verifyWebhookSignature(rawBody: string, signature: string, webhookId = '', timestamp = ''): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) throw new Error('WHOP_WEBHOOK_SECRET is not set');

  // Whop uses the Standard Webhooks spec: the signed content is
  // `${webhook-id}.${webhook-timestamp}.${body}`, HMAC-SHA256 with the full
  // secret string as the UTF-8 key, base64-encoded. The header may carry
  // multiple space-separated "v1,<sig>" entries — any match is valid.
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(signedContent).digest('base64');
  const provided = signature.split(/\s+/).map((s) => (s.includes(',') ? s.split(',')[1] : s));

  return provided.some((p) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(p, 'base64'), Buffer.from(expectedSig, 'base64'));
    } catch {
      return false;
    }
  });
}
