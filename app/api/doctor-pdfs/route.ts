import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorPdfs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import path from 'path';
import fs from 'fs';
export const dynamic = 'force-dynamic';

// GET — list all doctor PDFs for the user
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const rows = await db
      .select()
      .from(doctorPdfs)
      .where(eq(doctorPdfs.userId, userId))
      .orderBy(desc(doctorPdfs.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}

// POST — upload a new doctor PDF
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const subject = (formData.get('subject') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const dataDir = process.env.DATA_DIR || process.cwd();
    const uploadsDir = path.join(dataDir, 'doctor-pdfs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const id = nanoid();
    const safeName = `${id}.pdf`;
    const filePath = path.join(uploadsDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const row = await db.insert(doctorPdfs).values({
      id,
      userId,
      title: title.trim() || file.name.replace(/\.pdf$/i, ''),
      subject: subject.trim() || null,
      fileName: file.name,
      filePath,
      fileSize: buffer.length,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(row[0], { status: 201 });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Doctor PDF upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
