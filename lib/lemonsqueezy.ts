import crypto from 'crypto';

const LS_API = 'https://api.lemonsqueezy.com/v1';

export const LS_VARIANT_IDS = {
  pro_monthly: process.env.LS_PRO_MONTHLY_VARIANT_ID || '',
  pro_annual: process.env.LS_PRO_ANNUAL_VARIANT_ID || '',
  max_monthly: process.env.LS_MAX_MONTHLY_VARIANT_ID || '',
  max_annual: process.env.LS_MAX_ANNUAL_VARIANT_ID || '',
};

export function getPlanFromVariantId(variantId: string): { tier: 'pro' | 'max'; interval: 'monthly' | 'annual' } | null {
  if (variantId === LS_VARIANT_IDS.pro_monthly) return { tier: 'pro', interval: 'monthly' };
  if (variantId === LS_VARIANT_IDS.pro_annual) return { tier: 'pro', interval: 'annual' };
  if (variantId === LS_VARIANT_IDS.max_monthly) return { tier: 'max', interval: 'monthly' };
  if (variantId === LS_VARIANT_IDS.max_annual) return { tier: 'max', interval: 'annual' };
  return null;
}

function getApiKey(): string {
  const key = process.env.LS_API_KEY;
  if (!key) throw new Error('LS_API_KEY is not set');
  return key;
}

export async function createCheckout(variantId: string, userId: string, userEmail: string, redirectUrl: string) {
  const storeId = process.env.LS_STORE_ID;
  if (!storeId) throw new Error('LS_STORE_ID is not set');

  const res = await fetch(`${LS_API}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: { user_id: userId },
          },
          product_options: {
            redirect_url: redirectUrl,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LemonSqueezy checkout failed: ${text}`);
  }

  const data = await res.json();
  return data.data.attributes.url as string;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret) throw new Error('LS_WEBHOOK_SECRET is not set');

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
