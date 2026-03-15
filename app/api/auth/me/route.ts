import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ user: null });
  }

  const user = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    username: users.username,
    subscriptionTier: users.subscriptionTier,
  }).from(users).where(eq(users.id, auth.userId)).get();

  return NextResponse.json({ user: user || null });
}
