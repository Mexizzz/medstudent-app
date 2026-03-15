'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, Brain, Target, BarChart2, Loader2, Lock, Minus } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface InsightsData {
  thisWeek: {
    sessions: number;
    avgScore: number | null;
    totalCorrect: number;
    totalQuestions: number;
    studyMinutes: number;
    studyDays: number;
  };
  lastWeek: {
    sessions: number;
    avgScore: number | null;
    studyMinutes: number;
  };
  weakTopics: { topic: string; subject: string | null; avgScore: number | null; totalAttempts: number }[];
  strongTopics: { topic: string; subject: string | null; avgScore: number | null; totalAttempts: number }[];
}

function DeltaBadge({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const diff = current - previous;
  if (diff === 0 || (current === 0 && previous === 0)) return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> Same</span>;
  const isUp = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{Math.round(diff)}{suffix}
    </span>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights/weekly')
      .then(r => r.json())
      .then(d => {
        if (d.locked) { setLocked(true); }
        else { setData(d); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (locked) return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="text-center py-16">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-2">Study Insights</h2>
        <p className="text-sm text-muted-foreground mb-4">Weekly study reports are available with Pro or Max.</p>
        <Link href="/pricing"><Button className="gap-2">Upgrade <TierBadge tier="pro" size="sm" /></Button></Link>
      </div>
    </div>
  );

  if (!data) return null;

  const { thisWeek: tw, lastWeek: lw, weakTopics, strongTopics } = data;
  const hours = Math.round(tw.studyMinutes / 60 * 10) / 10;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Your study performance this week vs last week</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Study Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{hours}h</p>
          <DeltaBadge current={tw.studyMinutes} previous={lw.studyMinutes} suffix=" min" />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-violet-500" />
            <span className="text-xs text-muted-foreground">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{tw.sessions}</p>
          <DeltaBadge current={tw.sessions} previous={lw.sessions} />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Avg Score</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{tw.avgScore != null ? `${tw.avgScore}%` : '--'}</p>
          {tw.avgScore != null && lw.avgScore != null && (
            <DeltaBadge current={tw.avgScore} previous={lw.avgScore} suffix="%" />
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Study Days</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{tw.studyDays}/7</p>
          <p className="text-xs text-muted-foreground">{tw.totalCorrect}/{tw.totalQuestions} correct</p>
        </div>
      </div>

      {/* Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strongest Topics */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Strongest Topics
          </h3>
          {strongTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topic data yet</p>
          ) : (
            <div className="space-y-2.5">
              {strongTopics.map(t => (
                <div key={t.topic} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{t.topic}</p>
                    <p className="text-[10px] text-muted-foreground">{t.totalAttempts} answered</p>
                  </div>
                  <span className={`text-sm font-bold ${(t.avgScore ?? 0) >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {t.avgScore != null ? `${Math.round(t.avgScore)}%` : '--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weakest Topics */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" /> Needs Improvement
          </h3>
          {weakTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topic data yet</p>
          ) : (
            <div className="space-y-2.5">
              {weakTopics.map(t => (
                <div key={t.topic} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{t.topic}</p>
                    <p className="text-[10px] text-muted-foreground">{t.totalAttempts} answered</p>
                  </div>
                  <span className={`text-sm font-bold ${(t.avgScore ?? 0) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {t.avgScore != null ? `${Math.round(t.avgScore)}%` : '--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
