import { db } from '@/db';
import { studyPlanItems, srCards, studyGoals, userXp, users } from '@/db/schema';
import { getStreakInfo } from '@/lib/streak';
import { getAuthUser } from '@/lib/auth';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { TodayPlanCard } from '@/components/dashboard/TodayPlanCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, BarChart2, CalendarDays, Layers, Target, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { todayString } from '@/lib/utils';
import { todayStr } from '@/lib/sr';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';
import { TierBadge, TierGlow } from '@/components/ui/TierBadge';
import { WeakAutoQuizCard } from '@/components/dashboard/WeakAutoQuizCard';

export const dynamic = 'force-dynamic';

const quickActions = [
  { href: '/library', icon: BookOpen, label: 'Library', desc: 'Manage study content', color: 'text-violet-500', bg: 'bg-violet-50 group-hover:bg-violet-100 dark:bg-violet-500/10 dark:group-hover:bg-violet-500/20' },
  { href: '/study', icon: Brain, label: 'Study', desc: 'Practice questions', color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics', desc: 'View performance', color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20' },
  { href: '/study-plan', icon: CalendarDays, label: 'Plan', desc: 'Manage schedule', color: 'text-orange-500', bg: 'bg-orange-50 group-hover:bg-orange-100 dark:bg-orange-500/10 dark:group-hover:bg-orange-500/20' },
];

export default async function DashboardPage() {
  const auth = await getAuthUser();
  const userId = auth?.userId ?? '';
  const today = todayStr();

  const userRow = db.select({ name: users.name, tier: users.subscriptionTier }).from(users).where(eq(users.id, userId)).get();
  const userName = userRow?.name || '';
  const userTier = userRow?.tier || 'free';

  const [streakInfo, todayPlans, allSrCards, goals, xpRows] = await Promise.all([
    getStreakInfo(userId).catch(() => ({
      currentStreak: 0, longestStreak: 0, totalStudyDays: 0,
      todayComplete: false, last7Days: [],
    })),
    db.query.studyPlanItems.findMany({
      where: (p, { eq: e, and: a }) => a(e(p.userId, userId), e(p.planDate, todayString())),
    }),
    db.select().from(srCards).where(eq(srCards.userId, userId)),
    db.select().from(studyGoals).where(eq(studyGoals.userId, userId)).limit(1),
    db.select().from(userXp).where(eq(userXp.userId, userId)),
  ]);

  const xpProgress = getXpProgress(xpRows[0]?.totalXp ?? 0);
  const dueCount = allSrCards.filter(c => c.nextReviewDate <= today).length;
  const totalSrCards = allSrCards.length;
  const goal = goals[0] ?? null;

  let daysUntilExam: number | null = null;
  if (goal?.targetExamDate) {
    const diff = Math.ceil((new Date(goal.targetExamDate).getTime() - Date.now()) / 86400000);
    daysUntilExam = Math.max(0, diff);
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #000) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">
                {userName ? `Welcome back, ${userName} 👋` : 'Dashboard'}
              </h1>
              <TierBadge tier={userTier} size="md" />
            </div>
            <p className="text-white/70 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold">{streakInfo.currentStreak}</p>
              <p className="text-white/60 text-xs">day streak</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold">{xpProgress.totalXp.toLocaleString()}</p>
              <p className="text-white/60 text-xs">total XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* SR Alert Banner */}
      {dueCount > 0 && (
        <Link href="/study">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-500/20 rounded-lg">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {dueCount} flashcard{dueCount !== 1 ? 's' : ''} due for review
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400/70">Keep your spaced repetition streak going</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Streak + Today Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StreakWidget {...streakInfo} />
        <TodayPlanCard plans={todayPlans.map(p => ({ ...p, questionCount: p.questionCount ?? 20, isCompleted: p.isCompleted ?? false }))} />
      </div>

      {/* XP / Med Rank */}
      <TierGlow tier={userTier}>
        <Card className={`border-primary/20 ${userTier === 'max' ? 'ring-1 ring-amber-400/30' : userTier === 'pro' ? 'ring-1 ring-blue-400/20' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="text-4xl shrink-0">{xpProgress.rank.badge}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-base">{xpProgress.rank.title}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Level {xpProgress.rank.level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{xpProgress.totalXp.toLocaleString()} XP total</p>
                  <div className="mt-2 space-y-1">
                    <Progress value={xpProgress.percent} className="h-2.5 bg-muted" />
                    {xpProgress.nextRank ? (
                      <p className="text-[10px] text-muted-foreground">
                        {xpProgress.xpInLevel.toLocaleString()} / {xpProgress.xpForNext.toLocaleString()} XP → {xpProgress.nextRank.title}
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-500 font-medium">Max rank reached!</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  +10 XP correct
                </div>
                <div className="text-xs text-muted-foreground">+50 per session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TierGlow>

      {/* SR + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className={dueCount > 0 ? 'border-amber-200 dark:border-amber-500/30' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Spaced Repetition</p>
                <p className="text-xs text-muted-foreground">{totalSrCards} cards tracked</p>
              </div>
            </div>
            {totalSrCards === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">Complete a study session to start building your SR deck.</p>
            ) : dueCount > 0 ? (
              <p className="text-sm font-medium text-amber-500 mb-3">
                <span className="text-2xl font-bold">{dueCount}</span> card{dueCount !== 1 ? 's' : ''} due today
              </p>
            ) : (
              <p className="text-sm text-emerald-600 font-medium mb-3">✓ All caught up!</p>
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

        <Card className={goal ? 'border-blue-200 dark:border-blue-500/30' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Study Goals</p>
                <p className="text-xs text-muted-foreground">{goal?.examType ?? 'No exam set'}</p>
              </div>
            </div>
            {goal ? (
              <div className="space-y-2">
                {daysUntilExam !== null && (
                  <p className="text-sm text-foreground">
                    <span className="text-2xl font-bold text-blue-500">{daysUntilExam}</span>{' '}
                    day{daysUntilExam !== 1 ? 's' : ''} until exam
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Target: {goal.weeklyHoursTarget}h/week</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">Set your exam date and weekly study goal.</p>
            )}
            <Link href="/goals">
              <Button size="sm" variant="outline" className="w-full mt-3">
                {goal ? 'Update Goal' : 'Set Study Goal'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Weak Auto-Quiz */}
      <WeakAutoQuizCard tier={userTier} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, color, bg }) => (
            <Link key={href} href={href} prefetch>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group h-full border-transparent hover:border-border">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`p-3 rounded-xl transition-colors duration-150 ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
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
