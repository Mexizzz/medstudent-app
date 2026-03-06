import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();

    const { id } = await params;
    await db.delete(examProfiles).where(and(eq(examProfiles.id, id), eq(examProfiles.userId, userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
