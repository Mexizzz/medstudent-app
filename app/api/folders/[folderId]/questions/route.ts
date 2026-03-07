import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { folderQuestions, questionFolders, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET — list questions in a folder
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { folderId } = await params;

    // Verify folder belongs to user
    const [folder] = await db.select().from(questionFolders)
      .where(and(eq(questionFolders.id, folderId), eq(questionFolders.userId, userId)));
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const rows = await db
      .select({
        id: questions.id,
        type: questions.type,
        question: questions.question,
        front: questions.front,
        blankText: questions.blankText,
        caseQuestion: questions.caseQuestion,
        subject: questions.subject,
        topic: questions.topic,
        difficulty: questions.difficulty,
        addedAt: folderQuestions.addedAt,
      })
      .from(folderQuestions)
      .innerJoin(questions, eq(folderQuestions.questionId, questions.id))
      .where(eq(folderQuestions.folderId, folderId));

    return NextResponse.json(rows);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// POST — add a question to a folder
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { folderId } = await params;
    const { questionId } = await req.json();

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    // Verify folder belongs to user
    const [folder] = await db.select().from(questionFolders)
      .where(and(eq(questionFolders.id, folderId), eq(questionFolders.userId, userId)));
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check if already in folder
    const [existing] = await db.select().from(folderQuestions)
      .where(and(eq(folderQuestions.folderId, folderId), eq(folderQuestions.questionId, questionId)));
    if (existing) {
      return NextResponse.json({ error: 'Already in folder' }, { status: 409 });
    }

    await db.insert(folderQuestions).values({
      id: nanoid(),
      folderId,
      questionId,
      addedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// DELETE — remove a question from a folder
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { folderId } = await params;
    const { questionId } = await req.json();

    // Verify folder belongs to user
    const [folder] = await db.select().from(questionFolders)
      .where(and(eq(questionFolders.id, folderId), eq(questionFolders.userId, userId)));
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    await db.delete(folderQuestions)
      .where(and(eq(folderQuestions.folderId, folderId), eq(folderQuestions.questionId, questionId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
