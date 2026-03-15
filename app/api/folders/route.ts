import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questionFolders, folderQuestions } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, STATIC_LIMITS } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

// GET — list folders with question count
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db
      .select({
        id:        questionFolders.id,
        name:      questionFolders.name,
        color:     questionFolders.color,
        createdAt: questionFolders.createdAt,
        count:     sql<number>`(SELECT COUNT(*) FROM folder_questions WHERE folder_id = ${questionFolders.id})`,
      })
      .from(questionFolders)
      .where(eq(questionFolders.userId, userId))
      .orderBy(desc(questionFolders.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// POST — create a folder
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    const limits = STATIC_LIMITS[tier];
    const existing = await db.query.questionFolders.findMany({ where: eq(questionFolders.userId, userId), columns: { id: true } });
    if (existing.length >= limits.maxFolders) {
      return NextResponse.json({ error: `Folder limit reached (${limits.maxFolders} on ${tier} plan)`, upgradeRequired: true, tier }, { status: 429 });
    }

    const { name, color } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const [row] = await db.insert(questionFolders).values({
      id: nanoid(),
      userId,
      name: name.trim(),
      color: color || '#6366f1',
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
