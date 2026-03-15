import crypto from 'crypto';

const WHOP_API = 'https://api.whop.com/api/v1';

export const WHOP_PLAN_IDS = {
  pro_monthly: process.env.WHOP_PRO_MONTHLY_PLAN_ID || '',
  pro_annual: process.env.WHOP_PRO_ANNUAL_PLAN_ID || '',
  max_monthly: process.env.WHOP_MAX_MONTHLY_PLAN_ID || '',
  max_annual: process.env.WHOP_MAX_ANNUAL_PLAN_ID || '',
};

export function getPlanFromWhopPlanId(planId: string): { tier: 'pro' | 'max'; interval: 'monthly' | 'annual' } | null {
  if (planId === WHOP_PLAN_IDS.pro_monthly) return { tier: 'pro', interval: 'monthly' };
  if (planId === WHOP_PLAN_IDS.pro_annual) return { tier: 'pro', interval: 'annual' };
  if (planId === WHOP_PLAN_IDS.max_monthly) return { tier: 'max', interval: 'monthly' };
  if (planId === WHOP_PLAN_IDS.max_annual) return { tier: 'max', interval: 'annual' };
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
