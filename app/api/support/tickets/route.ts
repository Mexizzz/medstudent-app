import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { supportTickets, supportMessages } from '@/db/schema';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
export const dynamic = 'force-dynamic';

// GET — get messages for a ticket (user must own it)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const ticketId = req.nextUrl.searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket || ticket.userId !== userId) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);

    return NextResponse.json({ ticket, messages });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — user replies to their ticket
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { ticketId, message } = await req.json();

    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ error: 'Ticket ID and message required' }, { status: 400 });
    }

    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket || ticket.userId !== userId) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const now = new Date();
    const messageId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await db.insert(supportMessages).values({
      id: messageId,
      ticketId,
      senderId: userId,
      isAdmin: false,
      message: message.trim(),
      createdAt: now,
    });

    await db.update(supportTickets).set({
      status: 'open',
      updatedAt: now,
    }).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
