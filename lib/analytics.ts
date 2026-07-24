// Client-side conversion tracking. Fires the same event to Google Analytics
// (gtag) and the Meta Pixel (fbq) so ad platforms can attribute signups back
// to the click that produced them — which is what makes paid campaigns
// optimizable. Every call is a safe no-op when the underlying script isn't
// loaded (no GA/Pixel id configured, ad-blocker, SSR), so callers never need
// to guard.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Fire when a user finishes creating an account (the primary ad conversion). */
export function trackSignup(): void {
  if (typeof window === 'undefined') return;
  try {
    // GA4 recommended event for account creation.
    window.gtag?.('event', 'sign_up', { method: 'email' });
    // Meta standard event — the one you optimize ad delivery against.
    window.fbq?.('track', 'CompleteRegistration');
  } catch {
    /* tracking must never break the app */
  }
}

/** Fire when a user reaches the checkout / upgrade flow (mid-funnel signal). */
export function trackBeginCheckout(plan: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', 'begin_checkout', { plan });
    window.fbq?.('track', 'InitiateCheckout', { content_name: plan });
  } catch {
    /* no-op */
  }
}
