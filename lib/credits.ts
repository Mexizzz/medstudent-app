import { db } from '@/db';
import { users, creditTransactions } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ─── Credit pack catalog ─────────────────────────────────────────────────
// Catalog is driven entirely by env var WHOP_PACK_PLANS, so new packs can
// be added (or prices updated) without a deploy. Format:
//
//   WHOP_PACK_PLANS=<plan_id>:<price>:<credits>[:<tag>],<plan_id>:...
//
// Example:
//   WHOP_PACK_PLANS=plan_aaa:9:180,plan_bbb:24:520:MOST_POPULAR,plan_ccc:35:800,plan_ddd:55:1400:BEST_VALUE
//
// Currency is set by WHOP_PACK_CURRENCY (default SAR).

export interface CreditPack {
  id: string;             // we use the Whop plan_id as the stable id
  label: string;          // derived: e.g. "1,400 credits"
  credits: number;
  price: number;
  currency: string;       // ISO code, e.g. "SAR" / "GBP" / "USD"
  pricePerCredit: string; // display only
  tag?: string;           // optional badge text
  whopPlanId: string;
}

const TAG_LABELS: Record<string, string> = {
  MOST_POPULAR: 'MOST POPULAR',
  BEST_VALUE: 'BEST VALUE',
};

function currencySymbol(code: string): string {
  switch (code) {
    case 'GBP': return '£';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'SAR': return 'SAR ';
    default: return `${code} `;
  }
}

export function getCreditPacks(): CreditPack[] {
  const raw = process.env.WHOP_PACK_PLANS;
  const currency = process.env.WHOP_PACK_CURRENCY || 'SAR';
  if (!raw) return [];

  const sym = currencySymbol(currency);
  const packs: CreditPack[] = [];
  for (const entry of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const parts = entry.split(':').map(s => s.trim());
    if (parts.length < 3) continue;
    const [planId, priceStr, creditsStr, tagKey] = parts;
    const price = Number(priceStr);
    const credits = Number(creditsStr);
    if (!planId || !isFinite(price) || !isFinite(credits) || credits <= 0) continue;

    const perCredit = price / credits;
    packs.push({
      id: planId,
      whopPlanId: planId,
      label: `${credits.toLocaleString()} credits`,
      credits,
      price,
      currency,
      pricePerCredit: `${sym}${perCredit.toFixed(3)} / credit`,
      tag: tagKey ? (TAG_LABELS[tagKey] ?? tagKey) : undefined,
    });
  }

  // Sort by credits ascending so the page reads small → big.
  return packs.sort((a, b) => a.credits - b.credits);
}

/** Look up the credit grant for a Whop plan ID. Returns null if unknown. */
export function getCreditsForPlanId(planId: string): number | null {
  const pack = getCreditPacks().find(p => p.whopPlanId === planId);
  return pack ? pack.credits : null;
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
