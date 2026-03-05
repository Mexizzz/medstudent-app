import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { srCards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateSM2, todayStr } from '@/lib/sr';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { questionId, quality } = await req.json();
    if (!questionId || quality === undefined) {
      return NextResponse.json({ error: 'questionId and quality required' }, { status: 400 });
    }

    // Get existing card or create default
    const [existing] = await db.select().from(srCards).where(and(eq(srCards.questionId, questionId), eq(srCards.userId, userId))).limit(1);

    const cardInput = existing ?? { easeFactor: 2.5, interval: 1, repetitions: 0 };
    const updated = calculateSM2(cardInput, quality);

    if (existing) {
      await db.update(srCards).set({
        easeFactor: updated.easeFactor,
        interval: updated.interval,
        repetitions: updated.repetitions,
        nextReviewDate: updated.nextReviewDate,
        lastReviewDate: updated.lastReviewDate,
      }).where(eq(srCards.id, existing.id));
    } else {
      await db.insert(srCards).values({
        id: nanoid(),
        userId,
        questionId,
        easeFactor: updated.easeFactor,
        interval: updated.interval,
        repetitions: updated.repetitions,
        nextReviewDate: updated.nextReviewDate,
        lastReviewDate: updated.lastReviewDate,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ updated });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
