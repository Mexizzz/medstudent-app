'use client';

import { Crown, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  requiredTier?: 'pro' | 'max';
  limitReached?: boolean;
  used?: number;
  limit?: number;
}

export function UpgradeModal({ open, onClose, feature, requiredTier = 'pro', limitReached, used, limit }: UpgradeModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            {requiredTier === 'max' ? (
              <Crown className="w-6 h-6 text-violet-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-indigo-400" />
            )}
            <h2 className="text-lg font-bold text-white">
              {limitReached ? 'Daily Limit Reached' : 'Upgrade Required'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-300 mb-2">
          {limitReached
            ? `You've used ${used}/${limit} of your daily limit${feature ? ` for ${feature}` : ''}.`
            : `${feature || 'This feature'} is available on the ${requiredTier === 'max' ? 'Max' : 'Pro'} plan and above.`
          }
        </p>

        <p className="text-slate-400 text-sm mb-6">
          {limitReached
            ? 'Upgrade your plan for higher limits or wait until tomorrow.'
            : `Upgrade to ${requiredTier === 'max' ? 'Max' : 'Pro'} to unlock this feature and study without limits.`
          }
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => { onClose(); router.push('/pricing'); }}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}
