import type { Metadata } from 'next';
import Link from 'next/link';
import { AnimatedPricingCards } from '@/components/animations/AnimatedPricingCards';
import { ForceLightMode } from '@/components/ForceLightMode';
import { Sparkles, Zap, Globe } from 'lucide-react';

const SITE_URL = 'https://www.medstudy.space';

export const metadata: Metadata = {
  title: 'Plans & Pricing — MedStudy',
  description:
    'Full plan list for MedStudy. Free plan, Pro (£3.99/mo launch price), and Max (£7.49/mo launch price). 50% off all subscriptions during launch.',
  alternates: { canonical: `${SITE_URL}/plans` },
  openGraph: {
    title: 'MedStudy Plans & Pricing',
    description: 'Subscriptions for every study stage. Half price during launch.',
    url: `${SITE_URL}/plans`,
    type: 'website',
  },
};

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <ForceLightMode />

      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-400">M</div>
            <span className="font-bold">MedStudy</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold uppercase rounded tracking-wider">AI</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/blog" className="text-slate-600 hover:text-blue-600 transition-colors">Blog</Link>
            <Link href="/login" className="text-slate-600 hover:text-blue-600 transition-colors">Log in</Link>
            <Link href="/signup" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Sign up free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="py-14 sm:py-20 bg-gradient-to-b from-blue-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-sm font-bold mb-4 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            Launch Offer · 50% OFF for the next 3 months
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Plans &amp; Pricing</h1>
          <p className="mt-3 text-lg max-w-2xl mx-auto text-slate-600">
            Pick a subscription for everyday studying. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Subscription plans */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-3 border border-blue-200">
              <Zap className="w-3.5 h-3.5" />
              Subscriptions
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Choose your plan</h2>
            <p className="mt-2 text-slate-600">
              Daily AI generation limits + every premium feature for as long as you subscribe.
            </p>
          </div>
          <AnimatedPricingCards />
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center mb-8">How it works</h2>
          <div className="space-y-4 text-slate-700">
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/15 text-blue-700 font-bold text-sm shrink-0">1</div>
              <p><strong>Free, Pro, or Max</strong> sets your daily AI generation limit — 50, 250, or unlimited per day. Subscription unlocks features (Pro adds flashcards &amp; fill-in-blanks, Max adds clinical cases &amp; exam lab).</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-700 font-bold text-sm shrink-0">2</div>
              <p><strong>Cancel anytime.</strong> No lock-in — upgrade, downgrade, or cancel your subscription whenever you like.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-400">M</div>
            <span className="font-semibold">MedStudy</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
            <Link href="/signup" className="hover:text-blue-600 transition-colors">Sign up</Link>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Available worldwide
          </p>
        </div>
      </footer>
    </div>
  );
}
