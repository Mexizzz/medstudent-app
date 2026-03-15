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
      { name: 'MCQ Generation', value: '50/day', included: true },
      { name: 'Flashcard Generation', value: '50/day', included: true },
      { name: 'Fill in the Blank', value: '', included: false },
      { name: 'Short Answer', value: '', included: false },
      { name: 'Clinical Cases', value: '', included: false },
      { name: 'AI Tutor', value: '10 msgs/day', included: true },
      { name: 'AI Lesson Generator', value: '', included: false },
      { name: 'Summary AI Evaluation', value: '', included: false },
      { name: 'Exam Lab', value: '', included: false },
      { name: 'PDF Uploads', value: '5 total', included: true },
      { name: 'YouTube Import', value: '', included: false },
      { name: 'MCQ Bank Import', value: 'Yes', included: true },
      { name: 'Study Sessions', value: 'Yes', included: true },
      { name: 'Spaced Repetition', value: 'Yes', included: true },
      { name: 'Wrong Answers Review', value: 'Yes', included: true },
      { name: 'Study Plan', value: '', included: false },
      { name: 'Analytics', value: '7-day', included: true },
      { name: 'Question Folders', value: '3 max', included: true },
      { name: 'Study Rooms', value: 'Join only', included: true },
      { name: 'Friends & DMs', value: '5 friends', included: true },
      { name: 'XP & Ranking', value: 'Yes', included: true },
    ],
  },
  {
    id: 'pro' as Tier,
    name: 'Pro',
    icon: Sparkles,
    monthly: 7.99,
    annual: 4.99,
    description: 'Unlock AI tools & study smarter',
    popular: true,
    features: [
      { name: 'MCQ Generation', value: '250/day', included: true },
      { name: 'Flashcard Generation', value: '250/day', included: true },
      { name: 'Fill in the Blank', value: '250/day', included: true },
      { name: 'Short Answer', value: '250/day', included: true },
      { name: 'Clinical Cases', value: '', included: false },
      { name: 'AI Tutor', value: '100 msgs/day', included: true },
      { name: 'AI Lesson Generator', value: '10/day', included: true },
      { name: 'Summary AI Evaluation', value: '10/day', included: true },
      { name: 'Exam Lab', value: '', included: false },
      { name: 'PDF Uploads', value: '50 total', included: true },
      { name: 'YouTube Import', value: 'Yes', included: true },
      { name: 'MCQ Bank Import', value: 'Yes', included: true },
      { name: 'Study Sessions', value: 'Yes', included: true },
      { name: 'Spaced Repetition', value: 'Yes', included: true },
      { name: 'Wrong Answers Review', value: 'Yes', included: true },
      { name: 'Study Plan', value: 'Yes', included: true },
      { name: 'Analytics', value: '30-day', included: true },
      { name: 'Question Folders', value: '20 max', included: true },
      { name: 'Study Rooms', value: 'Create up to 5', included: true },
      { name: 'Friends & DMs', value: '30 friends', included: true },
      { name: 'XP & Ranking', value: 'Yes', included: true },
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
      { name: 'MCQ Generation', value: 'Unlimited', included: true },
      { name: 'Flashcard Generation', value: 'Unlimited', included: true },
      { name: 'Fill in the Blank', value: 'Unlimited', included: true },
      { name: 'Short Answer', value: 'Unlimited', included: true },
      { name: 'Clinical Cases', value: 'Unlimited', included: true },
      { name: 'AI Tutor', value: 'Unlimited', included: true },
      { name: 'AI Lesson Generator', value: 'Unlimited', included: true },
      { name: 'Summary AI Evaluation', value: 'Unlimited', included: true },
      { name: 'Exam Lab', value: 'Unlimited', included: true },
      { name: 'PDF Uploads', value: 'Unlimited', included: true },
      { name: 'YouTube Import', value: 'Yes', included: true },
      { name: 'MCQ Bank Import', value: 'Yes', included: true },
      { name: 'Study Sessions', value: 'Yes', included: true },
      { name: 'Spaced Repetition', value: 'Yes', included: true },
      { name: 'Wrong Answers Review', value: 'Yes', included: true },
      { name: 'Study Plan', value: 'Yes', included: true },
      { name: 'Analytics', value: 'Full + Export', included: true },
      { name: 'Question Folders', value: 'Unlimited', included: true },
      { name: 'Study Rooms', value: 'Unlimited', included: true },
      { name: 'Voice Chat', value: 'Yes', included: true },
      { name: 'Friends & DMs', value: 'Unlimited', included: true },
      { name: 'XP & Ranking', value: 'Yes', included: true },
    ],
  },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [subData, setSubData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(setSubData).catch(() => {});
  }, []);

  const currentTier = subData?.tier ?? 'free';

  async function handleUpgrade(plan: Tier) {
    if (plan === 'free' || plan === currentTier) return;

    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
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

  async function handleManageBilling() {
    setLoading('manage');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-slate-400 text-lg">Study smarter with the right tools for your journey</p>

          {/* Interval Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'annual' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-emerald-400 font-bold">Save 30%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map(plan => {
            const isCurrent = plan.id === currentTier;
            const price = interval === 'monthly' ? plan.monthly : plan.annual;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-indigo-500 bg-slate-800/80 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                </div>
                <p className="text-sm text-slate-400 mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${price.toFixed(2)}</span>
                  {price > 0 && <span className="text-slate-400 text-sm">/mo</span>}
                  {interval === 'annual' && price > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Billed ${(price * 12).toFixed(2)}/year</p>
                  )}
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-slate-700 text-slate-400 font-medium mb-6 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : plan.id === 'free' ? (
                  currentTier !== 'free' ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={loading === 'manage'}
                      className="w-full py-2.5 rounded-lg bg-slate-700 text-white font-medium mb-6 hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      {loading === 'manage' ? 'Loading...' : 'Manage Billing'}
                    </button>
                  ) : (
                    <div className="mb-6" />
                  )
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-2.5 rounded-lg font-medium mb-6 transition-colors disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {loading === plan.id ? 'Loading...' : `Upgrade to ${plan.name}`}
                  </button>
                )}

                <div className="flex-1 space-y-2.5">
                  {plan.features.map(feature => (
                    <div key={feature.name} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
                        {feature.name}
                      </span>
                      {feature.included && feature.value && (
                        <span className="ml-auto text-xs text-slate-500">{feature.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage billing for paid users */}
        {currentTier !== 'free' && (
          <div className="text-center">
            <button
              onClick={handleManageBilling}
              disabled={loading === 'manage'}
              className="text-sm text-indigo-400 hover:text-indigo-300 underline disabled:opacity-50"
            >
              Manage Billing & Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
