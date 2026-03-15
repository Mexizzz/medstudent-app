import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { featureRequests, featureVotes, users } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// GET — list all feature requests with vote status
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const requests = await db
      .select({
        id: featureRequests.id,
        userId: featureRequests.userId,
        userName: sql<string>`(SELECT coalesce(name, email) FROM users WHERE id = ${featureRequests.userId})`,
        title: featureRequests.title,
        description: featureRequests.description,
        category: featureRequests.category,
        status: featureRequests.status,
        adminNote: featureRequests.adminNote,
        upvoteCount: featureRequests.upvoteCount,
        createdAt: featureRequests.createdAt,
        hasVoted: sql<boolean>`EXISTS(SELECT 1 FROM feature_votes WHERE request_id = ${featureRequests.id} AND user_id = ${userId})`,
        isOwner: sql<boolean>`${featureRequests.userId} = ${userId}`,
      })
      .from(featureRequests)
      .orderBy(desc(featureRequests.upvoteCount), desc(featureRequests.createdAt));

    return NextResponse.json({ requests });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — submit a new feature request
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { title, description, category } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const validCategories = ['feature', 'improvement', 'bug'];
    const cat = validCategories.includes(category) ? category : 'feature';

    const id = `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await db.insert(featureRequests).values({
      id,
      userId,
      title: title.trim(),
      description: description.trim(),
      category: cat,
      status: 'open',
      upvoteCount: 1,
      createdAt: new Date(),
    });

    // Auto-upvote own request
    await db.insert(featureVotes).values({
      id: `vote_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      requestId: id,
      userId,
      createdAt: new Date(),
    });

    return NextResponse.json({ id });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — toggle vote on a request
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const existing = await db.query.featureVotes.findFirst({
      where: (v, { and, eq }) => and(eq(v.requestId, requestId), eq(v.userId, userId)),
    });

    if (existing) {
      // Remove vote
      await db.delete(featureVotes).where(eq(featureVotes.id, existing.id));
      await db.update(featureRequests)
        .set({ upvoteCount: sql`max(0, upvote_count - 1)` })
        .where(eq(featureRequests.id, requestId));
      return NextResponse.json({ voted: false });
    } else {
      // Add vote
      await db.insert(featureVotes).values({
        id: `vote_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        requestId,
        userId,
        createdAt: new Date(),
      });
      await db.update(featureRequests)
        .set({ upvoteCount: sql`upvote_count + 1` })
        .where(eq(featureRequests.id, requestId));
      return NextResponse.json({ voted: true });
    }
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
