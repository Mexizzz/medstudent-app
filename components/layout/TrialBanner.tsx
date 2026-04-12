'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Clock, X } from 'lucide-react';

function getDaysHoursLeft(endsAt: string): { days: number; hours: number } {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0 };
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

export function TrialBanner() {
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number } | null>(null);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) => {
        if (d.subscriptionStatus === 'trial' && d.subscriptionEndsAt) {
          setEndsAt(d.subscriptionEndsAt);
          setTimeLeft(getDaysHoursLeft(d.subscriptionEndsAt));
        }
      })
      .catch(() => {});
  }, []);

  // Tick every minute
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTimeLeft(getDaysHoursLeft(endsAt)), 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt || dismissed || !timeLeft) return null;
  if (timeLeft.days <= 0 && timeLeft.hours <= 0) return null;

  const urgent = timeLeft.days === 0;

  return (
    <div className={`relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${
      urgent
        ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white'
        : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Crown className="w-4 h-4 shrink-0 text-amber-300" />
        <span className="truncate">
          {urgent
            ? `Your Max trial ends in ${timeLeft.hours}h — upgrade to keep access`
            : `Max trial: ${timeLeft.days}d ${timeLeft.hours}h remaining — enjoy all features`}
        </span>
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold shrink-0">
          <Clock className="w-3 h-3" />
          {timeLeft.days}d {timeLeft.hours}h left
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/pricing"
          className="px-3 py-1 bg-white text-indigo-700 rounded-full text-xs font-bold hover:bg-white/90 transition-colors"
        >
          Upgrade
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
