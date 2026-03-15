const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export const PAYPAL_PLAN_IDS = {
  pro_monthly: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID || '',
  pro_annual: process.env.PAYPAL_PRO_ANNUAL_PLAN_ID || '',
  max_monthly: process.env.PAYPAL_MAX_MONTHLY_PLAN_ID || '',
  max_annual: process.env.PAYPAL_MAX_ANNUAL_PLAN_ID || '',
};

export function getPayPalPlanFromId(planId: string): { tier: 'pro' | 'max'; interval: 'monthly' | 'annual' } | null {
  if (planId === PAYPAL_PLAN_IDS.pro_monthly) return { tier: 'pro', interval: 'monthly' };
  if (planId === PAYPAL_PLAN_IDS.pro_annual) return { tier: 'pro', interval: 'annual' };
  if (planId === PAYPAL_PLAN_IDS.max_monthly) return { tier: 'max', interval: 'monthly' };
  if (planId === PAYPAL_PLAN_IDS.max_annual) return { tier: 'max', interval: 'annual' };
  return null;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function createPayPalSubscription(planId: string, userId: string, returnUrl: string, cancelUrl: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        brand_name: 'MedStudy',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal subscription creation failed: ${text}`);
  }

  return res.json();
}

export async function getPayPalSubscription(subscriptionId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal get subscription failed: ${text}`);
  }

  return res.json();
}

export async function verifyPayPalWebhookSignature(
  headers: Record<string, string>,
  body: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID not set');

  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
