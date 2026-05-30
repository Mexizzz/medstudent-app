import { db } from '@/db';
import { users, usageTracking, creditTransactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getMembership, getPlanFromWhopPlanId } from '@/lib/whop';

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
// Launch pricing — 50% off the regular rate (£7.99 Pro / £14.99 Max),
// valid through the launch window (~3 months from May 2026). Whop plans
// must be set to these same amounts; this constant is only display.
export const PRICING = {
  pro: { monthly: 3.99, annual: 2.49, annualTotal: 29.88 },
  max: { monthly: 7.49, annual: 4.99, annualTotal: 59.88 },
};
// Pre-launch "regular" prices, struck through on the pricing cards.
export const PRICING_REGULAR = {
  pro: { monthly: 7.99, annual: 4.99 },
  max: { monthly: 14.99, annual: 9.99 },
};

// ── Helpers ───────────────────────────────────────────
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Batch-downgrades all users whose trial has ended.
 * Trial users with a paid subscription would already have status='active' (set by Whop webhook),
 * so this only catches users who never converted. Safe to run frequently.
 */
export async function expireOldTrials(): Promise<{ downgraded: number }> {
  const result = await db.update(users)
    .set({ subscriptionTier: 'free', subscriptionStatus: 'active' })
    .where(and(
      eq(users.subscriptionStatus, 'trial'),
      sql`${users.subscriptionEndsAt} IS NOT NULL AND ${users.subscriptionEndsAt} < unixepoch()`,
    ));
  return { downgraded: result.changes ?? 0 };
}

/**
 * Reverts expired complimentary upgrades.
 * For each user with status='comp' whose subscriptionEndsAt has passed:
 *   - If they have a linked Whop membership that's still active, restore their Whop tier.
 *   - Otherwise downgrade to free.
 * Returns counts for logging.
 */
export async function expireComps(): Promise<{ reverted: number; errors: number }> {
  const expired = await db.query.users.findMany({
    where: and(
      eq(users.subscriptionStatus, 'comp'),
      sql`${users.subscriptionEndsAt} IS NOT NULL AND ${users.subscriptionEndsAt} < unixepoch()`,
    ),
    columns: { id: true, stripeSubscriptionId: true },
  });

  let reverted = 0;
  let errors = 0;
  for (const u of expired) {
    try {
      const whopId = u.stripeSubscriptionId?.startsWith('whop_')
        ? u.stripeSubscriptionId.slice(5)
        : null;

      if (whopId) {
        try {
          const m = await getMembership(whopId);
          const plan = m.planId ? getPlanFromWhopPlanId(m.planId) : null;
          const isActive = m.status === 'active' || m.status === 'trialing';
          if (plan && isActive) {
            await db.update(users).set({
              subscriptionTier: plan.tier,
              subscriptionStatus: 'active',
              subscriptionEndsAt: m.expiresAt ? new Date(m.expiresAt * 1000) : null,
            }).where(eq(users.id, u.id));
            reverted++;
            continue;
          }
        } catch (e) {
          console.error(`expireComps: Whop fetch failed for user ${u.id}`, e);
        }
      }

      // No active Whop membership → downgrade to free.
      await db.update(users).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionEndsAt: null,
      }).where(eq(users.id, u.id));
      reverted++;
    } catch (e) {
      console.error(`expireComps: revert failed for user ${u.id}`, e);
      errors++;
    }
  }
  return { reverted, errors };
}

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { subscriptionTier: true, subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!user) return 'free';

  // If trial has expired, lazily downgrade to free
  if (user.subscriptionStatus === 'trial' && user.subscriptionEndsAt) {
    if (new Date() > user.subscriptionEndsAt) {
      await db.update(users)
        .set({ subscriptionTier: 'free', subscriptionStatus: 'active' })
        .where(eq(users.id, userId));
      return 'free';
    }
    // Trial still active — return the stored tier (max)
    return (user.subscriptionTier as SubscriptionTier) || 'free';
  }

  // Comp upgrades: while active, return the comped tier. Past the end,
  // fall through to free here — the cron + admin GET will sync from Whop
  // to restore their actual paid tier in batch (expireComps).
  if (user.subscriptionStatus === 'comp' && user.subscriptionEndsAt) {
    if (new Date() > user.subscriptionEndsAt) return 'free';
    return (user.subscriptionTier as SubscriptionTier) || 'free';
  }

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
): Promise<{ allowed: boolean; used: number; limit: number; tier: SubscriptionTier; credits?: number; usingCredits?: boolean }> {
  const userTier = tier ?? await getUserTier(userId);
  const limit = DAILY_LIMITS[userTier][action];

  if (limit === Infinity) return { allowed: true, used: 0, limit, tier: userTier };

  const today = getToday();
  const record = await db.query.usageTracking.findFirst({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.action, action),
      eq(usageTracking.date, today),
    ),
  });
  const used = record?.count ?? 0;

  // Under the daily cap: allow as usual.
  if (limit > 0 && used < limit) {
    return { allowed: used < limit, used, limit, tier: userTier };
  }

  // At cap (or feature-blocked at limit=0) — check AI credits as fallback.
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { aiCredits: true },
  });
  const credits = userRow?.aiCredits ?? 0;
  if (credits > 0) {
    return { allowed: true, used, limit, tier: userTier, credits, usingCredits: true };
  }

  return { allowed: false, used, limit, tier: userTier, credits };
}

export async function incrementUsage(
  userId: string,
  action: UsageAction,
  amount: number = 1,
): Promise<void> {
  const today = getToday();
  const userTier = await getUserTier(userId);
  const limit = DAILY_LIMITS[userTier][action];

  const existing = await db.query.usageTracking.findFirst({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.action, action),
      eq(usageTracking.date, today),
    ),
  });
  const used = existing?.count ?? 0;

  // Split the increment: portion within the daily cap counts against
  // subscription usage, anything over is paid out of AI credits.
  let usageInc = amount;
  let creditDeduct = 0;
  if (limit !== Infinity) {
    const remaining = Math.max(0, limit - used);
    usageInc = Math.min(amount, remaining);
    creditDeduct = amount - usageInc;
  }

  if (creditDeduct > 0) {
    // Atomic decrement; if the user somehow ran out between checkUsageLimit
    // and now (race), we still log the usage but skip the credit consumption.
    const res = await db.update(users)
      .set({ aiCredits: sql`max(0, ${users.aiCredits} - ${creditDeduct})` })
      .where(eq(users.id, userId))
      .returning({ balance: users.aiCredits });
    if (res[0]) {
      await db.insert(creditTransactions).values({
        id: nanoid(),
        userId,
        amount: -creditDeduct,
        reason: `use:${action}`,
        refId: null,
        balanceAfter: res[0].balance,
        createdAt: new Date(),
      });
    }
  }

  if (existing) {
    await db.update(usageTracking)
      .set({ count: existing.count + usageInc })
      .where(eq(usageTracking.id, existing.id));
  } else if (usageInc > 0) {
    await db.insert(usageTracking).values({
      id: nanoid(),
      userId,
      action,
      count: usageInc,
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
