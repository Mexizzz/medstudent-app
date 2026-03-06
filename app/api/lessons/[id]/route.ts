import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    const row = await db.select().from(lessons).where(and(eq(lessons.id, id), eq(lessons.userId, userId))).get();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      lesson: {
        ...row,
        sections: JSON.parse(row.sections),
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    await db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
