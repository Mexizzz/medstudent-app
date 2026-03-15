import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// For backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  max_monthly: process.env.STRIPE_MAX_MONTHLY_PRICE_ID || '',
  max_annual: process.env.STRIPE_MAX_ANNUAL_PRICE_ID || '',
};

export function getPlanFromPriceId(priceId: string): { tier: 'pro' | 'max'; interval: 'monthly' | 'annual' } | null {
  if (priceId === PRICE_IDS.pro_monthly) return { tier: 'pro', interval: 'monthly' };
  if (priceId === PRICE_IDS.pro_annual) return { tier: 'pro', interval: 'annual' };
  if (priceId === PRICE_IDS.max_monthly) return { tier: 'max', interval: 'monthly' };
  if (priceId === PRICE_IDS.max_annual) return { tier: 'max', interval: 'annual' };
  return null;
}
