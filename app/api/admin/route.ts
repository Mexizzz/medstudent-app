import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, contentSources, questions, studySessions, sessionResponses, studyRooms, usageTracking, friendships, lessons, summaries, questionFolders, doctorPdfs } from '@/db/schema';
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

    // Basic counts
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [sourceCount] = await db.select({ count: sql<number>`count(*)` }).from(contentSources);
    const [questionCount] = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(studySessions);
    const [responseCount] = await db.select({ count: sql<number>`count(*)` }).from(sessionResponses);
    const [roomCount] = await db.select({ count: sql<number>`count(*)` }).from(studyRooms);
    const [lessonCount] = await db.select({ count: sql<number>`count(*)` }).from(lessons);
    const [summaryCount] = await db.select({ count: sql<number>`count(*)` }).from(summaries);
    const [folderCount] = await db.select({ count: sql<number>`count(*)` }).from(questionFolders);
    const [friendshipCount] = await db.select({ count: sql<number>`count(*)` }).from(friendships);
    const [doctorPdfCount] = await db.select({ count: sql<number>`count(*)` }).from(doctorPdfs);

    // Subscription tier breakdown
    const tierBreakdown = await db
      .select({
        tier: users.subscriptionTier,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.subscriptionTier);

    // Subscription status breakdown
    const statusBreakdown = await db
      .select({
        status: users.subscriptionStatus,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.subscriptionStatus);

    // Users with signups per day (last 30 days)
    const signupsPerDay = await db
      .select({
        date: sql<string>`date(created_at, 'unixepoch')`.as('date'),
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(sql`created_at > unixepoch('now', '-30 days')`)
      .groupBy(sql`date(created_at, 'unixepoch')`)
      .orderBy(sql`date(created_at, 'unixepoch')`);

    // Today's usage stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayUsage = await db
      .select({
        action: usageTracking.action,
        total: sql<number>`sum(count)`,
        uniqueUsers: sql<number>`count(distinct user_id)`,
      })
      .from(usageTracking)
      .where(eq(usageTracking.date, todayStr))
      .groupBy(usageTracking.action);

    // Average score across completed sessions
    const [avgScore] = await db
      .select({
        avg: sql<number>`round(avg(score), 1)`,
        completedCount: sql<number>`count(*)`,
      })
      .from(studySessions)
      .where(eq(studySessions.status, 'completed'));

    // All users with subscription data
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        passwordHash: users.passwordHash,
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        stripeCustomerId: users.stripeCustomerId,
        subscriptionEndsAt: users.subscriptionEndsAt,
        createdAt: users.createdAt,
        sessionCount: sql<number>`(SELECT count(*) FROM study_sessions WHERE user_id = ${users.id})`,
        responseCount: sql<number>`(SELECT count(*) FROM session_responses WHERE user_id = ${users.id})`,
        sourceCount: sql<number>`(SELECT count(*) FROM content_sources WHERE user_id = ${users.id})`,
        questionCount: sql<number>`(SELECT count(*) FROM questions WHERE source_id IN (SELECT id FROM content_sources WHERE user_id = ${users.id}))`,
        avgScore: sql<number>`(SELECT round(avg(score), 1) FROM study_sessions WHERE user_id = ${users.id} AND status = 'completed')`,
        lastActive: sql<string>`(SELECT max(started_at) FROM study_sessions WHERE user_id = ${users.id})`,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Recent sessions with user email
    const recentSessions = await db
      .select({
        id: studySessions.id,
        userId: studySessions.userId,
        userEmail: sql<string>`(SELECT email FROM users WHERE id = ${studySessions.userId})`,
        status: studySessions.status,
        totalQuestions: studySessions.totalQuestions,
        correctCount: studySessions.correctCount,
        score: studySessions.score,
        startedAt: studySessions.startedAt,
      })
      .from(studySessions)
      .orderBy(desc(studySessions.startedAt))
      .limit(30);

    // Study rooms with creator email
    const rooms = await db
      .select({
        id: studyRooms.id,
        name: studyRooms.name,
        joinCode: studyRooms.joinCode,
        createdAt: studyRooms.createdAt,
        creatorEmail: sql<string>`(SELECT email FROM users WHERE id = ${studyRooms.createdBy})`,
        memberCount: sql<number>`(SELECT count(*) FROM room_members WHERE room_id = ${studyRooms.id})`,
      })
      .from(studyRooms)
      .orderBy(desc(studyRooms.createdAt));

    // Content source type breakdown
    const sourceTypes = await db
      .select({
        type: contentSources.type,
        count: sql<number>`count(*)`,
      })
      .from(contentSources)
      .groupBy(contentSources.type);

    return NextResponse.json({
      stats: {
        users: userCount.count,
        sources: sourceCount.count,
        questions: questionCount.count,
        sessions: sessionCount.count,
        responses: responseCount.count,
        rooms: roomCount.count,
        lessons: lessonCount.count,
        summaries: summaryCount.count,
        folders: folderCount.count,
        friendships: friendshipCount.count,
        doctorPdfs: doctorPdfCount.count,
      },
      tierBreakdown,
      statusBreakdown,
      signupsPerDay,
      todayUsage,
      avgScore: avgScore.avg,
      completedSessions: avgScore.completedCount,
      sourceTypes,
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
