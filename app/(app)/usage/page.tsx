'use client';

import { useEffect, useState } from 'react';
import { TierBadge } from '@/components/ui/TierBadge';
import { Crown, Zap, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface UsageData {
  tier: string;
  usage: Record<string, { used: number; limit: number }>;
  features: Record<string, boolean>;
  resources: Record<string, { used: number; limit: number }>;
}

const ACTION_LABELS: Record<string, string> = {
  question_generate: 'Question Generation',
  tutor_message: 'AI Tutor Messages',
  lesson_generate: 'Lesson Generation',
  summary_evaluate: 'Summary Evaluation',
  exam_analyze: 'Exam Analysis',
  exam_generate: 'Exam Generation',
};

const FEATURE_LABELS: Record<string, { label: string; tier: string }> = {
  fill_blank: { label: 'Fill-in-the-Blank Questions', tier: 'Pro' },
  short_answer: { label: 'Short Answer Questions', tier: 'Pro' },
  clinical_case: { label: 'Clinical Case Questions', tier: 'Max' },
  lesson_generate: { label: 'AI Lesson Generation', tier: 'Pro' },
  summary_evaluate: { label: 'AI Summary Evaluation', tier: 'Pro' },
  exam_lab: { label: 'Exam Lab', tier: 'Max' },
  study_plan: { label: 'Study Plan', tier: 'Pro' },
  youtube_import: { label: 'YouTube Import', tier: 'Pro' },
  doctor_pdfs: { label: 'Doctor PDFs', tier: 'Pro' },
  create_rooms: { label: 'Create Study Rooms', tier: 'Pro' },
  voice_chat: { label: 'Voice Chat', tier: 'Max' },
  analytics_full: { label: 'Full Analytics', tier: 'Pro' },
  analytics_export: { label: 'Analytics Export', tier: 'Max' },
  timed_exam: { label: 'Timed Exam Mode', tier: 'Pro' },
  ai_explanations: { label: 'AI Answer Explanations', tier: 'Pro' },
  weak_auto_quiz: { label: 'Weak Topic Auto-Quiz', tier: 'Max' },
  pdf_export: { label: 'PDF/Notes Export', tier: 'Max' },
  room_challenges: { label: 'Room Challenges', tier: 'Pro' },
  custom_themes: { label: 'Custom Themes', tier: 'Max' },
  study_insights: { label: 'Weekly Study Insights', tier: 'Pro' },
};

const RESOURCE_LABELS: Record<string, string> = {
  contentSources: 'Content Sources',
  folders: 'Folders',
  friends: 'Friends',
  doctorPdfs: 'Doctor PDFs',
};

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch('/api/subscription').then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { tier, usage, features, resources } = data;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usage & Limits</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your daily usage and plan limits</p>
        </div>
        <TierBadge tier={tier} size="lg" />
      </div>

      {/* Daily Usage */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Daily Usage</h2>
        <div className="space-y-4">
          {Object.entries(usage).map(([action, { used, limit }]) => {
            const label = ACTION_LABELS[action] || action;
            const isUnlimited = limit === null || limit > 999999;
            const isLocked = limit === 0;
            const pct = isUnlimited ? 0 : isLocked ? 0 : Math.min((used / limit) * 100, 100);
            const isNearLimit = !isUnlimited && !isLocked && pct >= 80;

            return (
              <div key={action}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground">{label}</span>
                  {isLocked ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : isUnlimited ? (
                    <span className="text-xs text-emerald-500 font-medium">Unlimited</span>
                  ) : (
                    <span className={`text-xs font-medium ${isNearLimit ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {used} / {limit}
                    </span>
                  )}
                </div>
                {!isLocked && !isUnlimited && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Usage resets daily at midnight UTC</p>
      </div>

      {/* Resources */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Resources</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(resources).map(([key, { used, limit }]) => {
            const label = RESOURCE_LABELS[key] || key;
            const isUnlimited = limit === null || limit > 999999;
            const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);

            return (
              <div key={key} className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-bold text-foreground">
                  {used}
                  {!isUnlimited && <span className="text-muted-foreground font-normal text-sm"> / {limit}</span>}
                </p>
                {isUnlimited && <p className="text-[10px] text-emerald-500 font-medium">Unlimited</p>}
                {!isUnlimited && (
                  <div className="h-1.5 bg-background rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(features).map(([key, unlocked]) => {
            const info = FEATURE_LABELS[key];
            if (!info) return null;
            return (
              <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${unlocked ? 'bg-emerald-500/5' : 'bg-muted/50'}`}>
                {unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{info.label}</span>
                {!unlocked && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    info.tier === 'Max' ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
                  }`}>{info.tier}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {tier === 'free' && (
        <div className="text-center py-4">
          <Link href="/pricing">
            <Button className="gap-2">
              <Crown className="w-4 h-4" /> Upgrade Your Plan
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
