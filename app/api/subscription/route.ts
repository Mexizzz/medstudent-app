import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getUserTier, getUsageSummary, STATIC_LIMITS, FEATURE_ACCESS, hasFeature } from '@/lib/subscription';
import type { Feature } from '@/lib/subscription';
import { db } from '@/db';
import { contentSources, questionFolders, friendships, doctorPdfs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const tier = await getUserTier(userId);
    const usage = await getUsageSummary(userId, tier);
    const limits = STATIC_LIMITS[tier];

    // Get current static resource counts
    const [sourceCount, folderCount, friendCount, doctorPdfCount] = await Promise.all([
      db.query.contentSources.findMany({ where: eq(contentSources.userId, userId), columns: { id: true } }),
      db.query.questionFolders.findMany({ where: eq(questionFolders.userId, userId), columns: { id: true } }),
      db.query.friendships.findMany({ where: eq(friendships.userId, userId), columns: { id: true } }),
      db.query.doctorPdfs.findMany({ where: eq(doctorPdfs.userId, userId), columns: { id: true } }),
    ]);

    // Build features map
    const features: Record<string, boolean> = {};
    for (const feature of Object.keys(FEATURE_ACCESS) as Feature[]) {
      features[feature] = hasFeature(tier, feature);
    }

    return NextResponse.json({
      tier,
      usage,
      features,
      resources: {
        contentSources: { used: sourceCount.length, limit: limits.maxContentSources },
        folders: { used: folderCount.length, limit: limits.maxFolders },
        friends: { used: friendCount.length, limit: limits.maxFriends },
        doctorPdfs: { used: doctorPdfCount.length, limit: limits.maxDoctorPdfs },
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
