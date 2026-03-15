import { db } from '@/db';
import { users, usageTracking } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ── Types ─────────────────────────────────────────────
export type SubscriptionTier = 'free' | 'pro' | 'max';

export type UsageAction =
  | 'question_generate'
  | 'tutor_message'
  | 'lesson_generate'
  | 'summary_evaluate'
  | 'exam_analyze'
  | 'exam_generate';

// ── Features that are locked per tier ─────────────────
export type Feature =
  | 'fill_blank'
  | 'short_answer'
  | 'clinical_case'
  | 'lesson_generate'
  | 'summary_evaluate'
  | 'exam_lab'
  | 'study_plan'
  | 'youtube_import'
  | 'doctor_pdfs'
  | 'create_rooms'
  | 'voice_chat'
  | 'analytics_full'
  | 'analytics_export'
  | 'timed_exam'
  | 'ai_explanations'
  | 'weak_auto_quiz'
  | 'pdf_export'
  | 'room_challenges'
  | 'custom_themes'
  | 'study_insights';

export const FEATURE_ACCESS: Record<Feature, SubscriptionTier[]> = {
  fill_blank:       ['pro', 'max'],
  short_answer:     ['pro', 'max'],
  clinical_case:    ['max'],
  lesson_generate:  ['pro', 'max'],
  summary_evaluate: ['pro', 'max'],
  exam_lab:         ['max'],
  study_plan:       ['pro', 'max'],
  youtube_import:   ['pro', 'max'],
  doctor_pdfs:      ['pro', 'max'],
  create_rooms:     ['pro', 'max'],
  voice_chat:       ['max'],
  analytics_full:   ['pro', 'max'],
  analytics_export: ['max'],
  timed_exam:       ['pro', 'max'],
  ai_explanations:  ['pro', 'max'],
  weak_auto_quiz:   ['max'],
  pdf_export:       ['max'],
  room_challenges:  ['pro', 'max'],
  custom_themes:    ['max'],
  study_insights:   ['pro', 'max'],
};

// ── Daily usage limits ────────────────────────────────
export const DAILY_LIMITS: Record<SubscriptionTier, Record<UsageAction, number>> = {
  free: {
    question_generate: 50,
    tutor_message: 10,
    lesson_generate: 0,
    summary_evaluate: 0,
    exam_analyze: 0,
    exam_generate: 0,
  },
  pro: {
    question_generate: 250,
    tutor_message: 100,
    lesson_generate: 10,
    summary_evaluate: 10,
    exam_analyze: 0,
    exam_generate: 0,
  },
  max: {
    question_generate: Infinity,
    tutor_message: Infinity,
    lesson_generate: Infinity,
    summary_evaluate: Infinity,
    exam_analyze: Infinity,
    exam_generate: Infinity,
  },
};

// ── Static resource limits ────────────────────────────
export const STATIC_LIMITS: Record<SubscriptionTier, {
  maxContentSources: number;
  maxFolders: number;
  maxFriends: number;
  maxDoctorPdfs: number;
}> = {
  free: {
    maxContentSources: 5,
    maxFolders: 3,
    maxFriends: 5,
    maxDoctorPdfs: 0,
  },
  pro: {
    maxContentSources: 50,
    maxFolders: 20,
    maxFriends: 30,
    maxDoctorPdfs: 10,
  },
  max: {
    maxContentSources: Infinity,
    maxFolders: Infinity,
    maxFriends: Infinity,
    maxDoctorPdfs: Infinity,
  },
};

// ── Pricing ───────────────────────────────────────────
export const PRICING = {
  pro: { monthly: 7.99, annual: 4.99, annualTotal: 59.88 },
  max: { monthly: 14.99, annual: 9.99, annualTotal: 119.88 },
};

// ── Helpers ───────────────────────────────────────────
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { subscriptionTier: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!user) return 'free';

  // If subscription is canceled and past the end date, revert to free
  if (user.subscriptionStatus === 'canceled' && user.subscriptionEndsAt) {
    if (new Date() > user.subscriptionEndsAt) return 'free';
  }
  if (user.subscriptionStatus === 'past_due') return 'free';

  return (user.subscriptionTier as SubscriptionTier) || 'free';
}

export function hasFeature(tier: SubscriptionTier, feature: Feature): boolean {
  return FEATURE_ACCESS[feature].includes(tier);
}

export async function checkUsageLimit(
  userId: string,
  action: UsageAction,
  tier?: SubscriptionTier,
): Promise<{ allowed: boolean; used: number; limit: number; tier: SubscriptionTier }> {
  const userTier = tier ?? await getUserTier(userId);
  const limit = DAILY_LIMITS[userTier][action];

  if (limit === Infinity) return { allowed: true, used: 0, limit, tier: userTier };
  if (limit === 0) return { allowed: false, used: 0, limit: 0, tier: userTier };

  const today = getToday();
  const record = await db.query.usageTracking.findFirst({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.action, action),
      eq(usageTracking.date, today),
    ),
  });

  const used = record?.count ?? 0;
  return { allowed: used < limit, used, limit, tier: userTier };
}

export async function incrementUsage(
  userId: string,
  action: UsageAction,
  amount: number = 1,
): Promise<void> {
  const today = getToday();
  const existing = await db.query.usageTracking.findFirst({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.action, action),
      eq(usageTracking.date, today),
    ),
  });

  if (existing) {
    await db.update(usageTracking)
      .set({ count: existing.count + amount })
      .where(eq(usageTracking.id, existing.id));
  } else {
    await db.insert(usageTracking).values({
      id: nanoid(),
      userId,
      action,
      count: amount,
      date: today,
      createdAt: new Date(),
    });
  }
}

export async function getUsageSummary(
  userId: string,
  tier?: SubscriptionTier,
): Promise<Record<UsageAction, { used: number; limit: number }>> {
  const userTier = tier ?? await getUserTier(userId);
  const today = getToday();

  const records = await db.query.usageTracking.findMany({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.date, today),
    ),
  });

  const usageMap: Record<string, number> = {};
  for (const r of records) {
    usageMap[r.action] = r.count;
  }

  const actions: UsageAction[] = [
    'question_generate', 'tutor_message', 'lesson_generate',
    'summary_evaluate', 'exam_analyze', 'exam_generate',
  ];

  const summary: Record<string, { used: number; limit: number }> = {};
  for (const action of actions) {
    summary[action] = {
      used: usageMap[action] ?? 0,
      limit: DAILY_LIMITS[userTier][action],
    };
  }

  return summary as Record<UsageAction, { used: number; limit: number }>;
}
