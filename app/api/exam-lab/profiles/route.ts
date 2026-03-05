import { NextResponse } from 'next/server';
import { db } from '@/db';
import { examProfiles } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profiles = await db.select().from(examProfiles).orderBy(desc(examProfiles.createdAt));
    return NextResponse.json({ profiles });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
