import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubjectRadarChart } from '@/components/analytics/SubjectRadarChart';
import { PerformanceLineChart } from '@/components/analytics/PerformanceLineChart';
import { TopicBreakdownBar } from '@/components/analytics/TopicBreakdownBar';
import { WeaknessRemediationCard } from '@/components/analytics/WeaknessRemediationCard';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { scoreBg, scoreColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { db } from '@/db';
import { topicPerformance, studySessions } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getAnalytics() {
  try {
    const topics = await db
      .select()
      .from(topicPerformance)
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
      .where(sql`${studySessions.status} = 'completed'`)
      .orderBy(desc(studySessions.startedAt))
      .limit(30);

    // confidence = avgScore * min(attempts/10, 1) — rewards more attempts
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

    return {
      bySubject,
      byTopic: topics,
      overTime: [...recentSessions].reverse(),
      weakTopics,
      remediationTopics,
      strongTopics,
    };
  } catch {
    return { bySubject: [], byTopic: [], overTime: [], weakTopics: [], remediationTopics: [], strongTopics: [] };
  }
}

export default async function AnalyticsPage() {
  const { bySubject, byTopic, overTime, weakTopics, remediationTopics, strongTopics } = await getAnalytics();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Track your performance over time</p>
      </div>

      {byTopic.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-5 bg-slate-100 rounded-full">
            <BarChart2 className="w-10 h-10 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-600">No data yet</p>
            <p className="text-slate-400 text-sm">Complete some study sessions to see your analytics</p>
          </div>
        </div>
      ) : (
        <>
          {/* Weak & Strong */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {weakTopics.length > 0 && (
              <Card className="border-red-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <TrendingDown className="w-4 h-4" />
                    Needs Focus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {weakTopics.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.topic || t.subject}</p>
                        <p className="text-xs text-slate-400">{t.totalAttempts} attempts</p>
                      </div>
                      <Badge className={cn('text-xs', scoreBg(Math.round(t.avgScore ?? 0)))}>
                        {Math.round(t.avgScore ?? 0)}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {strongTopics.length > 0 && (
              <Card className="border-emerald-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                    Strong Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {strongTopics.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.topic || t.subject}</p>
                        <p className="text-xs text-slate-400">{t.totalAttempts} attempts</p>
                      </div>
                      <Badge className={cn('text-xs', scoreBg(Math.round(t.avgScore ?? 0)))}>
                        {Math.round(t.avgScore ?? 0)}%
                      </Badge>
                    </div>
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
              <CardTitle className="text-base">Topic Breakdown (sorted by score)</CardTitle>
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
