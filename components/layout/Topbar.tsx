import { Flame } from 'lucide-react';
import { getStreakInfo } from '@/lib/streak';

export async function Topbar() {
  let streak = 0;
  let todayComplete = false;
  try {
    const info = await getStreakInfo();
    streak = info.currentStreak;
    todayComplete = info.todayComplete;
  } catch {}

  return (
    <header className="fixed top-0 right-0 left-56 h-14 bg-white border-b border-border flex items-center justify-between px-6 z-10">
      <div />
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border
          ${todayComplete
            ? 'bg-orange-50 text-orange-600 border-orange-200'
            : 'bg-slate-50 text-slate-400 border-slate-200'
          }`}>
          <Flame className="w-4 h-4" />
          <span>{streak} day{streak !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </header>
  );
}
