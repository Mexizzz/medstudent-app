import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceSignals, roomMembers } from '@/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, AuthError } from '@/lib/auth';

// GET — poll for incoming signals
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const since = req.nextUrl.searchParams.get('since');

    const sinceDate = since ? new Date(parseInt(since)) : new Date(Date.now() - 30000);

    const signals = await db
      .select()
      .from(voiceSignals)
      .where(
        and(
          eq(voiceSignals.roomId, roomId),
          eq(voiceSignals.toUserId, userId),
          gt(voiceSignals.createdAt, sinceDate)
        )
      );

    // Clean up old signals (>30s)
    const cutoff = new Date(Date.now() - 30000);
    await db.delete(voiceSignals).where(
      and(eq(voiceSignals.roomId, roomId), lt(voiceSignals.createdAt, cutoff))
    );

    return NextResponse.json({ signals, serverTime: Date.now() });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    throw error;
  }
}

// POST — send a signal (offer/answer/ice-candidate)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { roomId } = await params;
    const { toUserId, type, payload } = await req.json();

    if (!toUserId || !type || !payload) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
      return NextResponse.json({ error: 'Invalid signal type' }, { status: 400 });
    }

    await db.insert(voiceSignals).values({
      id: nanoid(),
      roomId,
      fromUserId: userId,
      toUserId,
      type,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    throw error;
  }
}
