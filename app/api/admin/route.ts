import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, contentSources, questions, studySessions, sessionResponses, studyRooms } from '@/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [sourceCount] = await db.select({ count: sql<number>`count(*)` }).from(contentSources);
    const [questionCount] = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(studySessions);
    const [responseCount] = await db.select({ count: sql<number>`count(*)` }).from(sessionResponses);
    const [roomCount] = await db.select({ count: sql<number>`count(*)` }).from(studyRooms);

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
        sessionCount: sql<number>`(SELECT count(*) FROM study_sessions WHERE user_id = ${users.id})`,
        responseCount: sql<number>`(SELECT count(*) FROM session_responses WHERE user_id = ${users.id})`,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const recentSessions = await db
      .select({
        id: studySessions.id,
        userId: studySessions.userId,
        status: studySessions.status,
        totalQuestions: studySessions.totalQuestions,
        correctCount: studySessions.correctCount,
        score: studySessions.score,
        startedAt: studySessions.startedAt,
      })
      .from(studySessions)
      .orderBy(desc(studySessions.startedAt))
      .limit(20);

    const rooms = await db
      .select({
        id: studyRooms.id,
        name: studyRooms.name,
        joinCode: studyRooms.joinCode,
        createdAt: studyRooms.createdAt,
        memberCount: sql<number>`(SELECT count(*) FROM room_members WHERE room_id = ${studyRooms.id})`,
      })
      .from(studyRooms)
      .orderBy(desc(studyRooms.createdAt));

    return NextResponse.json({
      stats: {
        users: userCount.count,
        sources: sourceCount.count,
        questions: questionCount.count,
        sessions: sessionCount.count,
        responses: responseCount.count,
        rooms: roomCount.count,
      },
      users: allUsers,
      recentSessions,
      rooms,
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — reset a user's password
export async function PATCH(req: NextRequest) {
  try {
    const { adminPassword, userId, newPassword } = await req.json();
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }
    if (!userId || !newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'User ID and new password (min 4 chars) required' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
