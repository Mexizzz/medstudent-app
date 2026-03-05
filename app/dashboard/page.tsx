import { db } from '@/db';
import { studyPlanItems, srCards, studyGoals, userXp } from '@/db/schema';
import { getStreakInfo } from '@/lib/streak';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { TodayPlanCard } from '@/components/dashboard/TodayPlanCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, BarChart2, CalendarDays, Layers, Target, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { todayString } from '@/lib/utils';
import { todayStr } from '@/lib/sr';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = todayStr();
  const [streakInfo, todayPlans, allSrCards, goals, xpRows] = await Promise.all([
    getStreakInfo().catch(() => ({
      currentStreak: 0, longestStreak: 0, totalStudyDays: 0,
      todayComplete: false, last7Days: [],
    })),
    db.query.studyPlanItems.findMany({
      where: (p, { eq }) => eq(p.planDate, todayString()),
    }),
    db.select().from(srCards),
    db.select().from(studyGoals).limit(1),
    db.select().from(userXp).where(eq(userXp.id, 1)),
  ]);

  const xpProgress = getXpProgress(xpRows[0]?.totalXp ?? 0);

  const dueCount = allSrCards.filter(c => c.nextReviewDate <= today).length;
  const totalSrCards = allSrCards.length;
  const goal = goals[0] ?? null;

  // Days until exam
  let daysUntilExam: number | null = null;
  if (goal?.targetExamDate) {
    const diff = Math.ceil((new Date(goal.targetExamDate).getTime() - Date.now()) / 86400000);
    daysUntilExam = Math.max(0, diff);
  }

  const quickActions = [
    { href: '/library', icon: BookOpen, label: 'Library', desc: 'Manage study content' },
    { href: '/study', icon: Brain, label: 'Study', desc: 'Practice questions' },
    { href: '/analytics', icon: BarChart2, label: 'Analytics', desc: 'View performance' },
    { href: '/study-plan', icon: CalendarDays, label: 'Plan', desc: 'Manage schedule' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StreakWidget {...streakInfo} />
        <TodayPlanCard plans={todayPlans.map(p => ({ ...p, questionCount: p.questionCount ?? 20, isCompleted: p.isCompleted ?? false }))} />
      </div>

      {/* Med Rank / XP Widget */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="text-3xl shrink-0">{xpProgress.rank.badge}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-base">{xpProgress.rank.title}</span>
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                    Level {xpProgress.rank.level}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {xpProgress.totalXp.toLocaleString()} XP total
                </p>
                <div className="mt-2 space-y-1">
                  <Progress value={xpProgress.percent} className="h-2 bg-violet-100" />
                  {xpProgress.nextRank ? (
                    <p className="text-[10px] text-slate-400">
                      {xpProgress.xpInLevel.toLocaleString()} / {xpProgress.xpForNext.toLocaleString()} XP → {xpProgress.nextRank.title}
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-500 font-medium">Max rank reached!</p>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">Med Rank</p>
              <p className="text-xs text-slate-500 mt-1">+10 XP per correct</p>
              <p className="text-xs text-slate-500">+50 per session</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SR + Goals row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Spaced Repetition Widget */}
        <Card className={dueCount > 0 ? 'border-amber-200 bg-amber-50/40' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Layers className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Spaced Repetition</p>
                <p className="text-xs text-slate-400">{totalSrCards} cards tracked</p>
              </div>
            </div>
            {totalSrCards === 0 ? (
              <p className="text-xs text-slate-400 mb-3">Complete a study session to start building your SR deck.</p>
            ) : dueCount > 0 ? (
              <p className="text-sm font-medium text-amber-700 mb-3">
                <span className="text-2xl font-bold">{dueCount}</span> card{dueCount !== 1 ? 's' : ''} due for review today
              </p>
            ) : (
              <p className="text-sm text-emerald-600 font-medium mb-3">✓ All caught up! No cards due today.</p>
            )}
            {dueCount > 0 && (
              <Link href="/study">
                <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  Review {dueCount} Due Card{dueCount !== 1 ? 's' : ''}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Study Goals Widget */}
        <Card className={goal ? 'border-blue-200 bg-blue-50/40' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Study Goals</p>
                <p className="text-xs text-slate-400">{goal?.examType ?? 'No exam set'}</p>
              </div>
            </div>
            {goal ? (
              <div className="space-y-2">
                {daysUntilExam !== null && (
                  <p className="text-sm text-slate-700">
                    <span className="text-2xl font-bold text-blue-600">{daysUntilExam}</span>{' '}
                    day{daysUntilExam !== 1 ? 's' : ''} until exam
                  </p>
                )}
                <p className="text-xs text-slate-400">Target: {goal.weeklyHoursTarget}h/week</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-3">Set your exam date and weekly study goal.</p>
            )}
            <Link href="/goals">
              <Button size="sm" variant="outline" className="w-full mt-3">
                {goal ? 'Update Goal' : 'Set Study Goal'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
