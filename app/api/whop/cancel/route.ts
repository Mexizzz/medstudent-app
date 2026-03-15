import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { cancelSubscription } from '@/lib/whop';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await requireAuth();

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subId = user.stripeSubscriptionId;
    if (!subId || !subId.startsWith('whop_')) {
      return NextResponse.json({ error: 'No active Whop subscription' }, { status: 400 });
    }

    const membershipId = subId.replace('whop_', '');
    await cancelSubscription(membershipId);

    // Mark as canceling at period end (webhook will finalize)
    await db.update(users).set({
      subscriptionStatus: 'canceled',
    }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Whop cancel error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
