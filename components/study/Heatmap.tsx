'use client';

interface Props {
  days: Array<{ date: string; seconds: number }>;
}

function level(seconds: number): number {
  if (seconds === 0) return 0;
  if (seconds < 900) return 1;
  if (seconds < 2700) return 2;
  if (seconds < 5400) return 3;
  return 4;
}

const LEVEL_CLS = [
  'bg-muted/40',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
];

export function Heatmap({ days }: Props) {
  const weeks: Array<Array<{ date: string; seconds: number } | null>> = [];
  let current: Array<{ date: string; seconds: number } | null> = [];

  if (days.length > 0) {
    const first = new Date(days[0].date + 'T00:00:00Z');
    const firstWeekday = first.getUTCDay();
    const padBefore = (firstWeekday + 6) % 7;
    for (let i = 0; i < padBefore; i++) current.push(null);
  }

  for (const day of days) {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    while (current.length < 7) current.push(null);
    weeks.push(current);
  }

  const totalHours = Math.round(days.reduce((sum, d) => sum + d.seconds, 0) / 3600);
  const activeDays = days.filter(d => d.seconds > 0).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-foreground">Study heatmap</p>
          <p className="text-[10px] text-muted-foreground">Last 180 days</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{totalHours}h</p>
          <p className="text-[10px] text-muted-foreground">{activeDays} days active</p>
        </div>
      </div>

      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((d, di) => d === null ? (
              <div key={di} className="w-2.5 h-2.5" />
            ) : (
              <div
                key={di}
                title={`${d.date} — ${Math.round(d.seconds / 60)} min`}
                className={`w-2.5 h-2.5 rounded-sm ${LEVEL_CLS[level(d.seconds)]}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        <span>less</span>
        {LEVEL_CLS.map((cls, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
