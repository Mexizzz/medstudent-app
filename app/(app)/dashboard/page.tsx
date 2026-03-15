import { db } from '@/db';
import { studyPlanItems, srCards, studyGoals, userXp, users } from '@/db/schema';
import { getStreakInfo } from '@/lib/streak';
import { getAuthUser } from '@/lib/auth';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { TodayPlanCard } from '@/components/dashboard/TodayPlanCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, BookOpen, BarChart2, CalendarDays, Layers, Target } from 'lucide-react';
import Link from 'next/link';
import { todayString } from '@/lib/utils';
import { todayStr } from '@/lib/sr';
import { getXpProgress } from '@/lib/xp';
import { eq } from 'drizzle-orm';
import { TierBadge, TierGlow } from '@/components/ui/TierBadge';
import { WeakAutoQuizCard } from '@/components/dashboard/WeakAutoQuizCard';

export const dynamic = 'force-dynamic';

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
      where: (p, { eq, and }) => and(eq(p.userId, userId), eq(p.planDate, todayString())),
    }),
    db.select().from(srCards).where(eq(srCards.userId, userId)),
    db.select().from(studyGoals).where(eq(studyGoals.userId, userId)).limit(1),
    db.select().from(userXp).where(eq(userXp.userId, userId)),
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {userName ? `Welcome back, ${userName}` : 'Dashboard'}
          </h1>
          <TierBadge tier={userTier} size="md" />
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StreakWidget {...streakInfo} />
        <TodayPlanCard plans={todayPlans.map(p => ({ ...p, questionCount: p.questionCount ?? 20, isCompleted: p.isCompleted ?? false }))} />
      </div>

      {/* Med Rank / XP Widget */}
      <TierGlow tier={userTier}>
      <Card className={`border-primary/20 bg-card ${userTier === 'max' ? 'ring-1 ring-amber-400/30' : userTier === 'pro' ? 'ring-1 ring-blue-400/20' : ''}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="text-3xl shrink-0">{xpProgress.rank.badge}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-base">{xpProgress.rank.title}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Level {xpProgress.rank.level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {xpProgress.totalXp.toLocaleString()} XP total
                </p>
                <div className="mt-2 space-y-1">
                  <Progress value={xpProgress.percent} className="h-2 bg-muted" />
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
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Med Rank</p>
              <p className="text-xs text-muted-foreground mt-1">+10 XP per correct</p>
              <p className="text-xs text-muted-foreground">+50 per session</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </TierGlow>

      {/* SR + Goals row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Spaced Repetition Widget */}
        <Card className={dueCount > 0 ? 'border-amber-500/20' : ''}>
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
        <Card className={goal ? 'border-blue-500/20' : ''}>
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

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
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
