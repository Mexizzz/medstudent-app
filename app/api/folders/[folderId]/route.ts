import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questionFolders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// PUT — rename folder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { folderId } = await params;
    const { name, color } = await req.json();

    const updates: Record<string, string> = {};
    if (name?.trim()) updates.name = name.trim();
    if (color) updates.color = color;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await db.update(questionFolders)
      .set(updates)
      .where(and(eq(questionFolders.id, folderId), eq(questionFolders.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// DELETE — delete folder
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { folderId } = await params;

    await db.delete(questionFolders)
      .where(and(eq(questionFolders.id, folderId), eq(questionFolders.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
