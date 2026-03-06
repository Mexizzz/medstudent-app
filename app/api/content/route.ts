import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources, questions } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const sources = await db
      .select({
        id: contentSources.id,
        type: contentSources.type,
        title: contentSources.title,
        subject: contentSources.subject,
        topic: contentSources.topic,
        wordCount: contentSources.wordCount,
        pageCount: contentSources.pageCount,
        youtubeId: contentSources.youtubeId,
        youtubeUrl: contentSources.youtubeUrl,
        status: contentSources.status,
        createdAt: contentSources.createdAt,
      })
      .from(contentSources)
      .where(eq(contentSources.userId, userId))
      .orderBy(sql`${contentSources.createdAt} desc`);

    // Get question counts per source (only for this user's sources)
    const sourceIds = sources.map(s => s.id);
    const counts = sourceIds.length > 0
      ? await db
          .select({
            sourceId: questions.sourceId,
            type: questions.type,
            count: sql<number>`count(*)`,
          })
          .from(questions)
          .where(sql`${questions.sourceId} IN (${sql.join(sourceIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(questions.sourceId, questions.type)
      : [];

    // Attach counts to sources
    const sourcesWithCounts = sources.map(s => ({
      ...s,
      questionCounts: counts
        .filter(c => c.sourceId === s.id)
        .map(c => ({ type: c.type, count: c.count })),
    }));

    return NextResponse.json(sourcesWithCounts);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
