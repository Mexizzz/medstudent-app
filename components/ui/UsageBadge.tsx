'use client';

interface UsageBadgeProps {
  used: number;
  limit: number;
  label?: string;
}

export function UsageBadge({ used, limit, label }: UsageBadgeProps) {
  if (limit === Infinity || limit === 0) return null;

  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  return (
    <div className="flex items-center gap-2 text-xs">
      {label && <span className="text-slate-500">{label}</span>}
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`font-medium ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-400'}`}>
          {used}/{limit}
        </span>
      </div>
    </div>
  );
}
