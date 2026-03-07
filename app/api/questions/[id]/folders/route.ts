import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { folderQuestions, questionFolders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET — list which folders a question belongs to
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id: questionId } = await params;

    const rows = await db
      .select({ folderId: folderQuestions.folderId })
      .from(folderQuestions)
      .innerJoin(questionFolders, eq(folderQuestions.folderId, questionFolders.id))
      .where(and(
        eq(folderQuestions.questionId, questionId),
        eq(questionFolders.userId, userId)
      ));

    return NextResponse.json(rows);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
