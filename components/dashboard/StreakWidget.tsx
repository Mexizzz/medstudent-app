'use client';

import { Flame, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  todayComplete: boolean;
  last7Days: { date: string; studied: boolean }[];
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  totalStudyDays,
  todayComplete,
  last7Days,
}: StreakWidgetProps) {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Study Streak</p>
            <div className="flex items-center gap-2 mt-1">
              <Flame className={cn('w-7 h-7', currentStreak > 0 ? 'text-orange-500' : 'text-slate-300')} />
              <span className="text-3xl font-bold">{currentStreak}</span>
              <span className="text-slate-500 text-sm">days</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-slate-500">Best: <span className="font-semibold text-slate-700">{longestStreak}</span></div>
            <div className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-700">{totalStudyDays}</span></div>
          </div>
        </div>

        {/* 7-day calendar row */}
        <div className="flex gap-1.5">
          {last7Days.map((day) => {
            const d = new Date(day.date + 'T00:00:00');
            const label = dayLabels[d.getDay()];
            const isToday = day.date === new Date().toISOString().split('T')[0];
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className={cn('text-xs', isToday ? 'font-bold text-blue-600' : 'text-slate-400')}>
                  {label}
                </span>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  day.studied ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-300',
                  isToday && !day.studied && 'border-2 border-blue-300'
                )}>
                  {day.studied && <Flame className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {!todayComplete && (
          <p className="text-xs text-center text-slate-400 mt-3">
            Study today to keep your streak!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
