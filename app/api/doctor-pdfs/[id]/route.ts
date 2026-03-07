import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorPdfs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
import fs from 'fs';
export const dynamic = 'force-dynamic';

// GET — serve the PDF file
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const [pdf] = await db
      .select()
      .from(doctorPdfs)
      .where(and(eq(doctorPdfs.id, id), eq(doctorPdfs.userId, userId)));

    if (!pdf) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!fs.existsSync(pdf.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const buffer = fs.readFileSync(pdf.filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdf.fileName}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// DELETE — remove a doctor PDF
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const [pdf] = await db
      .select()
      .from(doctorPdfs)
      .where(and(eq(doctorPdfs.id, id), eq(doctorPdfs.userId, userId)));

    if (!pdf) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete file from disk
    if (fs.existsSync(pdf.filePath)) {
      fs.unlinkSync(pdf.filePath);
    }

    // Delete from DB
    await db.delete(doctorPdfs).where(eq(doctorPdfs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
