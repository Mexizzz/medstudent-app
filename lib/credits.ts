import { db } from '@/db';
import { users, creditTransactions } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ─── Credit pack catalog ─────────────────────────────────────────────────
// Whop plan IDs are sourced from env so a 4th pack can be added later
// without code changes. Marketing copy lives here.
export type CreditPackId = 'starter' | 'standard' | 'bulk';

export interface CreditPack {
  id: CreditPackId;
  label: string;
  credits: number;
  priceGbp: number;
  pricePerCredit: string; // display only
  tag?: string;           // e.g. "MOST POPULAR" / "BEST VALUE"
  whopPlanId: string | null;
}

export function getCreditPacks(): CreditPack[] {
  return [
    {
      id: 'starter',
      label: 'Starter',
      credits: 200,
      priceGbp: 2.99,
      pricePerCredit: '£0.015 / credit',
      whopPlanId: process.env.WHOP_CREDITS_200_PLAN_ID || null,
    },
    {
      id: 'standard',
      label: 'Standard',
      credits: 1000,
      priceGbp: 9.99,
      pricePerCredit: '£0.010 / credit',
      tag: 'MOST POPULAR',
      whopPlanId: process.env.WHOP_CREDITS_1000_PLAN_ID || null,
    },
    {
      id: 'bulk',
      label: 'Bulk',
      credits: 5000,
      priceGbp: 39.99,
      pricePerCredit: '£0.008 / credit',
      tag: 'BEST VALUE',
      whopPlanId: process.env.WHOP_CREDITS_5000_PLAN_ID || null,
    },
  ];
}

// ─── Balance ─────────────────────────────────────────────────────────────

export async function getCreditBalance(userId: string): Promise<number> {
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { aiCredits: true },
  });
  return u?.aiCredits ?? 0;
}

// ─── Grant credits (purchase / comp / refund) ───────────────────────────

/**
 * Add credits to a user's balance and log the transaction.
 * Safe to call from webhooks — uses an atomic SQL increment.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<{ balance: number } | { error: string }> {
  if (amount <= 0) return { error: 'amount must be positive' };

  const result = await db.update(users)
    .set({ aiCredits: sql`${users.aiCredits} + ${amount}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.aiCredits });

  if (!result.length) return { error: 'user not found' };
  const balance = result[0].balance;

  await db.insert(creditTransactions).values({
    id: nanoid(),
    userId,
    amount,
    reason,
    refId: refId ?? null,
    balanceAfter: balance,
    createdAt: new Date(),
  });

  return { balance };
}

// ─── Consume credits (when daily limit is hit) ──────────────────────────

/**
 * Atomically decrement N credits if the balance allows it. Returns null
 * if the user doesn't have enough credits — caller should treat as
 * "out of credits, deny the action."
 */
export async function consumeCredits(
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<{ balance: number } | null> {
  if (amount <= 0) return { balance: await getCreditBalance(userId) };

  // Conditional update: only deduct if balance >= amount. Atomic, no race.
  const result = await db.update(users)
    .set({ aiCredits: sql`${users.aiCredits} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.aiCredits} >= ${amount}`)
    .returning({ balance: users.aiCredits });

  if (!result.length) return null; // insufficient balance
  const balance = result[0].balance;

  await db.insert(creditTransactions).values({
    id: nanoid(),
    userId,
    amount: -amount,
    reason,
    refId: refId ?? null,
    balanceAfter: balance,
    createdAt: new Date(),
  });

  return { balance };
}

// ─── Recent transactions (for UI display) ───────────────────────────────

export async function getRecentTransactions(userId: string, limit = 25) {
  return db.select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}
