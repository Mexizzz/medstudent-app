'use client';

import { Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = 'md', showLabel = true, className }: TierBadgeProps) {
  if (tier === 'free') return null;

  const isMax = tier === 'max';
  const isPro = tier === 'pro';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold tracking-wide relative overflow-hidden',
        sizeClasses[size],
        isMax && 'bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 text-amber-400 ring-1 ring-amber-500/30 tier-badge-max',
        isPro && 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 ring-1 ring-blue-500/30 tier-badge-pro',
        className,
      )}
    >
      {isMax && <Crown className={cn(iconSizes[size], 'tier-icon-max')} />}
      {isPro && <Zap className={cn(iconSizes[size], 'tier-icon-pro')} />}
      {showLabel && (isMax ? 'MAX' : 'PRO')}
    </span>
  );
}

export function TierGlow({ tier, children, className }: { tier: string; children: React.ReactNode; className?: string }) {
  if (tier === 'free') return <>{children}</>;

  const isMax = tier === 'max';

  return (
    <div className={cn('relative', className)}>
      {isMax && (
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 rounded-2xl blur-lg tier-glow-max" />
      )}
      {tier === 'pro' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/15 via-indigo-400/10 to-blue-500/15 rounded-2xl blur-lg tier-glow-pro" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
