import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubjectRadarChart } from '@/components/analytics/SubjectRadarChart';
import { PerformanceLineChart } from '@/components/analytics/PerformanceLineChart';
import { TopicBreakdownBar } from '@/components/analytics/TopicBreakdownBar';
import { WeaknessRemediationCard } from '@/components/analytics/WeaknessRemediationCard';
import { TrendingUp, TrendingDown, BarChart2, Target, Activity } from 'lucide-react';
import { scoreBg, scoreColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { db } from '@/db';
import { topicPerformance, studySessions } from '@/db/schema';
import { sql, desc, eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getAnalytics() {
  try {
    const { userId } = await requireAuth();

    const topics = await db
      .select()
      .from(topicPerformance)
      .where(eq(topicPerformance.userId, userId))
      .orderBy(sql`${topicPerformance.avgScore} asc`);

    const subjectMap = new Map<string, { totalAttempts: number; correctAttempts: number }>();
    for (const t of topics) {
      const key = t.subject;
      const s = subjectMap.get(key) ?? { totalAttempts: 0, correctAttempts: 0 };
      s.totalAttempts += t.totalAttempts ?? 0;
      s.correctAttempts += t.correctAttempts ?? 0;
      subjectMap.set(key, s);
    }

    const bySubject = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      avgScore: data.totalAttempts > 0 ? (data.correctAttempts / data.totalAttempts) * 100 : 0,
      totalAttempts: data.totalAttempts,
    }));

    const recentSessions = await db
      .select({
        id: studySessions.id,
        score: studySessions.score,
        startedAt: studySessions.startedAt,
        totalQuestions: studySessions.totalQuestions,
        correctCount: studySessions.correctCount,
      })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), sql`${studySessions.status} = 'completed'`))
      .orderBy(desc(studySessions.startedAt))
      .limit(30);

    const withConfidence = topics.map(t => ({
      ...t,
      confidence: (t.avgScore ?? 0) * Math.min((t.totalAttempts ?? 0) / 10, 1),
    }));

    const weakTopics = withConfidence.filter(t => (t.totalAttempts ?? 0) >= 3).slice(0, 5);
    const remediationTopics = withConfidence
      .filter(t => (t.totalAttempts ?? 0) >= 3 && t.confidence < 50)
      .slice(0, 3);
    const strongTopics = [...withConfidence]
      .filter(t => (t.totalAttempts ?? 0) >= 3)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
      .slice(0, 5);

    // Summary stats
    const totalAttempts = topics.reduce((s, t) => s + (t.totalAttempts ?? 0), 0);
    const overallScore = totalAttempts > 0
      ? topics.reduce((s, t) => s + (t.avgScore ?? 0) * (t.totalAttempts ?? 0), 0) / totalAttempts
      : 0;

    return {
      bySubject,
      byTopic: topics,
      overTime: [...recentSessions].reverse(),
      weakTopics,
      remediationTopics,
      strongTopics,
      totalSessions: recentSessions.length,
      totalAttempts,
      overallScore,
    };
  } catch {
    return { bySubject: [], byTopic: [], overTime: [], weakTopics: [], remediationTopics: [], strongTopics: [], totalSessions: 0, totalAttempts: 0, overallScore: 0 };
  }
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', scoreBg(Math.round(score)))}>
      {Math.round(score)}%
    </span>
  );
}

function TopicRow({ topic, showBar = true }: { topic: { topic: string | null; subject: string; avgScore: number | null; totalAttempts: number | null }; showBar?: boolean }) {
  const score = Math.round(topic.avgScore ?? 0);
  const barColor = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{topic.topic || topic.subject}</p>
          <p className="text-xs text-muted-foreground">{topic.totalAttempts} attempt{topic.totalAttempts !== 1 ? 's' : ''}</p>
        </div>
        <ScoreBadge score={topic.avgScore ?? 0} />
      </div>
      {showBar && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  const { bySubject, byTopic, overTime, weakTopics, remediationTopics, strongTopics, totalSessions, totalAttempts, overallScore } = await getAnalytics();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your performance over time</p>
      </div>

      {byTopic.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">No data yet</p>
            <p className="text-muted-foreground text-sm mt-1">Complete some study sessions to see your analytics</p>
          </div>
          <Link href="/study">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Start Studying
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: totalSessions, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
              { label: 'Questions', value: totalAttempts.toLocaleString(), icon: Target, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
              { label: 'Avg Score', value: `${Math.round(overallScore)}%`, icon: BarChart2, color: overallScore >= 70 ? 'text-emerald-500' : overallScore >= 50 ? 'text-amber-500' : 'text-red-500', bg: overallScore >= 70 ? 'bg-emerald-50 dark:bg-emerald-500/10' : overallScore >= 50 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-red-50 dark:bg-red-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl', bg)}>
                    <Icon className={cn('w-5 h-5', color)} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weak & Strong */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {weakTopics.length > 0 && (
              <Card className="border-red-100 dark:border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                    <TrendingDown className="w-4 h-4" />
                    Needs Focus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weakTopics.map((t) => (
                    <TopicRow key={t.id} topic={t} />
                  ))}
                </CardContent>
              </Card>
            )}

            {strongTopics.length > 0 && (
              <Card className="border-emerald-100 dark:border-emerald-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    Strong Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strongTopics.map((t) => (
                    <TopicRow key={t.id} topic={t} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Weakness Remediation */}
          {remediationTopics.length > 0 && (
            <WeaknessRemediationCard weakTopics={remediationTopics} />
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <SubjectRadarChart data={bySubject} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceLineChart data={overTime} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Topic Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <TopicBreakdownBar data={byTopic} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
