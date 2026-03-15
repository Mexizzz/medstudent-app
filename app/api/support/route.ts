import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { supportTickets, supportMessages } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// GET — list user's tickets
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const tickets = await db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        lastMessage: sql<string>`(SELECT message FROM support_messages WHERE ticket_id = ${supportTickets.id} ORDER BY created_at DESC LIMIT 1)`,
        messageCount: sql<number>`(SELECT count(*) FROM support_messages WHERE ticket_id = ${supportTickets.id})`,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.updatedAt));

    return NextResponse.json({ tickets });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create a new ticket
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { subject, message } = await req.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const now = new Date();
    const ticketId = `tkt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const messageId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await db.insert(supportTickets).values({
      id: ticketId,
      userId,
      subject: subject.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(supportMessages).values({
      id: messageId,
      ticketId,
      senderId: userId,
      isAdmin: false,
      message: message.trim(),
      createdAt: now,
    });

    return NextResponse.json({ ticketId });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
