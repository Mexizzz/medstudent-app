'use client';

import { useState, useEffect } from 'react';
import { Check, X, Sparkles, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';

type Tier = 'free' | 'pro' | 'max';
type Interval = 'monthly' | 'annual';

interface SubData {
  tier: Tier;
  usage: Record<string, { used: number; limit: number }>;
  features: Record<string, boolean>;
  resources: Record<string, { used: number; limit: number }>;
}

const plans = [
  {
    id: 'free' as Tier,
    name: 'Free',
    icon: Zap,
    monthly: 0,
    annual: 0,
    description: 'Get started with the essentials',
    features: [
      { name: 'MCQ & Flashcard Generation', value: '50/day', included: true },
      { name: 'AI Tutor', value: '10 msgs/day', included: true },
      { name: 'PDF Uploads', value: '5 total', included: true },
      { name: 'Study Sessions & Reviews', value: 'Yes', included: true },
      { name: 'Analytics', value: '7-day', included: true },
      { name: 'Question Folders', value: '3 max', included: true },
      { name: 'Friends & DMs', value: '5 friends', included: true },
      { name: 'Fill in Blank / Short Answer', included: false },
      { name: 'Clinical Cases', included: false },
      { name: 'AI Lessons & Summaries', included: false },
      { name: 'Exam Lab', included: false },
      { name: 'YouTube Import', included: false },
    ],
  },
  {
    id: 'pro' as Tier,
    name: 'Pro',
    icon: Sparkles,
    monthly: 7.99,
    annual: 4.99,
    description: 'Unlock all AI tools & study smarter',
    popular: true,
    features: [
      { name: 'MCQ & Flashcard Generation', value: '250/day', included: true },
      { name: 'AI Tutor', value: '100 msgs/day', included: true },
      { name: 'PDF Uploads', value: '50 total', included: true },
      { name: 'Study Sessions & Reviews', value: 'Yes', included: true },
      { name: 'Analytics', value: '30-day', included: true },
      { name: 'Question Folders', value: '20 max', included: true },
      { name: 'Friends & DMs', value: '30 friends', included: true },
      { name: 'Fill in Blank / Short Answer', value: '250/day', included: true },
      { name: 'AI Lessons & Summaries', value: '10/day', included: true },
      { name: 'YouTube Import', value: 'Yes', included: true },
      { name: 'Study Rooms', value: 'Create up to 5', included: true },
      { name: 'Clinical Cases', included: false },
      { name: 'Exam Lab', included: false },
    ],
  },
  {
    id: 'max' as Tier,
    name: 'Max',
    icon: Crown,
    monthly: 14.99,
    annual: 9.99,
    description: 'Everything unlimited, no limits',
    features: [
      { name: 'MCQ & Flashcard Generation', value: 'Unlimited', included: true },
      { name: 'AI Tutor', value: 'Unlimited', included: true },
      { name: 'PDF Uploads', value: 'Unlimited', included: true },
      { name: 'Study Sessions & Reviews', value: 'Yes', included: true },
      { name: 'Analytics', value: 'Full + Export', included: true },
      { name: 'Question Folders', value: 'Unlimited', included: true },
      { name: 'Friends & DMs', value: 'Unlimited', included: true },
      { name: 'Fill in Blank / Short Answer', value: 'Unlimited', included: true },
      { name: 'AI Lessons & Summaries', value: 'Unlimited', included: true },
      { name: 'YouTube Import', value: 'Yes', included: true },
      { name: 'Study Rooms', value: 'Unlimited', included: true },
      { name: 'Clinical Cases', value: 'Unlimited', included: true },
      { name: 'Exam Lab', value: 'Unlimited', included: true },
    ],
  },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [subData, setSubData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(setSubData).catch(() => {});
  }, []);

  const currentTier = subData?.tier ?? 'free';

  async function handleUpgrade(plan: Tier) {
    if (plan === 'free' || plan === currentTier) return;

    setLoading(plan);
    try {
      const res = await fetch('/api/whop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    setLoading('cancel');
    try {
      const res = await fetch('/api/whop/cancel', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Subscription cancelled. You\'ll keep access until the end of your billing period.');
        setShowCancelConfirm(false);
        setSubData(prev => prev ? { ...prev, tier: 'free' } : prev);
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Study smarter with the right tools for your journey</p>

          {/* Interval Toggle */}
          <div className="flex items-center justify-center gap-1 mt-6 bg-muted rounded-xl p-1 w-fit mx-auto">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'annual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-emerald-500 font-bold">-30%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {plans.map(plan => {
            const isCurrent = plan.id === currentTier;
            const price = interval === 'monthly' ? plan.monthly : plan.annual;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-primary bg-card shadow-lg shadow-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                <div className="mb-5">
                  <span className="text-4xl font-bold text-foreground">${price.toFixed(2)}</span>
                  {price > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                  {interval === 'annual' && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Billed ${(price * 12).toFixed(2)}/year</p>
                  )}
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-muted text-muted-foreground font-medium mb-5 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : plan.id === 'free' ? (
                  currentTier !== 'free' ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-2.5 rounded-lg bg-muted text-foreground font-medium mb-5 hover:bg-muted/80 transition-colors"
                    >
                      Downgrade to Free
                    </button>
                  ) : (
                    <div className="mb-5" />
                  )
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-2.5 rounded-lg font-medium mb-5 transition-colors disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                    }`}
                  >
                    {loading === plan.id ? 'Loading...' : `Upgrade to ${plan.name}`}
                  </button>
                )}

                <div className="flex-1 space-y-2">
                  {plan.features.map(feature => (
                    <div key={feature.name} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                        {feature.name}
                      </span>
                      {feature.included && feature.value && (
                        <span className="ml-auto text-xs text-muted-foreground">{feature.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancel confirmation */}
        {currentTier !== 'free' && (
          <div className="text-center">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-foreground mb-2">Cancel Subscription?</h3>
              <p className="text-sm text-muted-foreground mb-1">
                You&apos;ll keep your <span className="font-semibold text-foreground capitalize">{currentTier}</span> access until the end of your current billing period.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                After that, you&apos;ll be downgraded to the Free plan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                  Keep Plan
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading === 'cancel'}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading === 'cancel' ? 'Cancelling...' : 'Cancel Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
