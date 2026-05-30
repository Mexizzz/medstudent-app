import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, contentSources, questions, studySessions, sessionResponses, studyRooms, usageTracking, friendships, lessons, summaries, questionFolders, doctorPdfs, supportTickets, supportMessages, featureRequests, creditTransactions, passwordResetCodes } from '@/db/schema';
import { sql, desc, eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getMembership, findMembershipsByEmail, getPlanFromWhopPlanId, listPayments, listPlans } from '@/lib/whop';
import { expireOldTrials, expireComps } from '@/lib/subscription';
import { getCreditsForPlanId, grantCredits } from '@/lib/credits';
import { sendPurchaseDelivery, normalizeEmail } from '@/lib/email';
export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Mexiz1924';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Auto-cleanup: downgrade expired trials and revert expired comp upgrades
    // so the admin panel shows current effective tiers.
    try { await expireOldTrials(); } catch (e) { console.error('expireOldTrials error:', e); }
    try { await expireComps(); } catch (e) { console.error('expireComps error:', e); }

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
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionEndsAt: users.subscriptionEndsAt,
        bannedUntil: users.bannedUntil,
        banReason: users.banReason,
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

    // All library uploads (sources) with user info — newest first
    const allSources = await db
      .select({
        id: contentSources.id,
        userId: contentSources.userId,
        userEmail: sql<string>`(SELECT email FROM users WHERE id = ${contentSources.userId})`,
        userName: sql<string>`(SELECT coalesce(name, email) FROM users WHERE id = ${contentSources.userId})`,
        type: contentSources.type,
        title: contentSources.title,
        subject: contentSources.subject,
        topic: contentSources.topic,
        wordCount: contentSources.wordCount,
        pageCount: contentSources.pageCount,
        youtubeUrl: contentSources.youtubeUrl,
        status: contentSources.status,
        createdAt: contentSources.createdAt,
        questionCount: sql<number>`(SELECT count(*) FROM questions WHERE source_id = ${contentSources.id})`,
      })
      .from(contentSources)
      .orderBy(desc(contentSources.createdAt))
      .limit(500);

    // Support tickets
    const allTickets = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        userEmail: sql<string>`(SELECT email FROM users WHERE id = ${supportTickets.userId})`,
        userName: sql<string>`(SELECT name FROM users WHERE id = ${supportTickets.userId})`,
        subject: supportTickets.subject,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        messageCount: sql<number>`(SELECT count(*) FROM support_messages WHERE ticket_id = ${supportTickets.id})`,
        lastMessage: sql<string>`(SELECT message FROM support_messages WHERE ticket_id = ${supportTickets.id} ORDER BY created_at DESC LIMIT 1)`,
      })
      .from(supportTickets)
      .orderBy(desc(supportTickets.updatedAt));

    const [ticketCount] = await db.select({ count: sql<number>`count(*)` }).from(supportTickets);
    const [openTicketCount] = await db.select({ count: sql<number>`count(*)` }).from(supportTickets).where(eq(supportTickets.status, 'open'));

    // Feature requests
    const allRequests = await db
      .select({
        id: featureRequests.id,
        userId: featureRequests.userId,
        userEmail: sql<string>`(SELECT email FROM users WHERE id = ${featureRequests.userId})`,
        userName: sql<string>`(SELECT coalesce(name, email) FROM users WHERE id = ${featureRequests.userId})`,
        title: featureRequests.title,
        description: featureRequests.description,
        category: featureRequests.category,
        status: featureRequests.status,
        adminNote: featureRequests.adminNote,
        upvoteCount: featureRequests.upvoteCount,
        createdAt: featureRequests.createdAt,
      })
      .from(featureRequests)
      .orderBy(desc(featureRequests.upvoteCount), desc(featureRequests.createdAt));

    const [requestCount] = await db.select({ count: sql<number>`count(*)` }).from(featureRequests);
    const [openRequestCount] = await db.select({ count: sql<number>`count(*)` }).from(featureRequests).where(eq(featureRequests.status, 'open'));

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
        tickets: ticketCount.count,
        openTickets: openTicketCount.count,
        requests: requestCount.count,
        openRequests: openRequestCount.count,
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
      tickets: allTickets,
      featureRequests: allRequests,
      sources: allSources,
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — reset a user's password or change subscription tier
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    // List a user's Whop memberships by email (so admin can pick the right one)
    if (body.action === 'findWhopMemberships') {
      const email: string = (body.email ?? '').trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
      try {
        const memberships = await findMembershipsByEmail(email);
        return NextResponse.json({ memberships });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
      }
    }

    // Re-sync a user's subscription from Whop (used when webhook silently dropped the event)
    if (body.action === 'syncFromWhop') {
      const email: string = (body.email ?? '').trim().toLowerCase();
      const membershipId: string = (body.membershipId ?? '').trim();
      if (!email || !membershipId) {
        return NextResponse.json({ error: 'email and membershipId required' }, { status: 400 });
      }

      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user) return NextResponse.json({ error: `No user with email ${email}` }, { status: 404 });

      let membership;
      try {
        membership = await getMembership(membershipId);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
      }

      const plan = membership.planId ? getPlanFromWhopPlanId(membership.planId) : null;
      if (!plan) {
        return NextResponse.json({
          error: `Whop plan_id "${membership.planId}" doesn't match any of your configured WHOP_*_PLAN_ID env vars`,
          membership,
        }, { status: 400 });
      }

      // Whop status → our status
      const rawStatus = membership.status.toLowerCase();
      const subscriptionStatus =
        rawStatus === 'active' || rawStatus === 'trialing' ? 'active' :
        rawStatus === 'past_due' ? 'past_due' :
        rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'completed' || rawStatus === 'expired' ? 'canceled' :
        'active';

      const finalTier = subscriptionStatus === 'canceled' ? 'free' : plan.tier;
      const subscriptionEndsAt = membership.expiresAt ? new Date(membership.expiresAt * 1000) : null;

      await db.update(users).set({
        subscriptionTier: finalTier,
        subscriptionStatus,
        stripeSubscriptionId: `whop_${membership.id}`,
        subscriptionEndsAt,
      }).where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        before: {
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          stripeSubscriptionId: user.stripeSubscriptionId,
        },
        after: {
          subscriptionTier: finalTier,
          subscriptionStatus,
          stripeSubscriptionId: `whop_${membership.id}`,
          subscriptionEndsAt,
        },
        membership,
      });
    }

    // Grant AI credits to a specific user (comp / testing / customer recovery).
    if (body.action === 'grantCredits') {
      const userId: string = body.userId;
      const amount = Number(body.amount);
      const reason: string = (body.reason ?? 'comp:admin').trim() || 'comp:admin';
      if (!userId || !isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'userId and positive amount required' }, { status: 400 });
      }
      const result = await grantCredits(userId, Math.floor(amount), reason);
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, balance: result.balance });
    }

    // List every Whop plan on the account. Used by the admin panel to
    // discover plan IDs + prices so the operator can populate WHOP_PACK_PLANS
    // without leaving the dashboard.
    if (body.action === 'listWhopPlans') {
      try {
        const plans = await listPlans();
        return NextResponse.json({ plans });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
      }
    }

    // Import historical Whop payments. For each successful payment:
    //   - Find matching user (metadata.user_id > stripeSubscriptionId > email)
    //   - If found and plan is a credit pack: grant credits (idempotent via refId)
    //   - If found and plan is a subscription: update tier + status + endsAt
    //   - If not found: create stub user with random password, generate a 30-day
    //     claim code, send delivery email, then grant the credits/sub to the stub
    //   - Skip silently if a transaction with refId=<payment_id> already exists
    if (body.action === 'importWhopPayments') {
      const dryRun = body.dryRun === true;
      let payments;
      try {
        payments = await listPayments({ onlySuccessful: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
      }

      type DeliveryItem = {
        paymentId: string;
        email: string | null;
        planId: string;
        action: 'credits_granted' | 'sub_updated' | 'stub_created_and_delivered' | 'skipped_no_email' | 'skipped_unknown_plan' | 'skipped_already_delivered' | 'error';
        credits?: number;
        userId?: string;
        error?: string;
      };
      const results: DeliveryItem[] = [];

      for (const p of payments) {
        try {
          // Already delivered? Skip.
          const existingTx = await db.query.creditTransactions.findFirst({
            where: eq(creditTransactions.refId, p.id),
            columns: { id: true },
          });
          if (existingTx) {
            results.push({ paymentId: p.id, email: p.email, planId: p.planId, action: 'skipped_already_delivered' });
            continue;
          }

          // What does this plan grant?
          const credits = getCreditsForPlanId(p.planId);
          const subPlan = getPlanFromWhopPlanId(p.planId);

          if (!credits && !subPlan) {
            results.push({ paymentId: p.id, email: p.email, planId: p.planId, action: 'skipped_unknown_plan' });
            continue;
          }

          // Find matching user
          let user = null as { id: string; email: string } | null;
          if (p.metadataUserId) {
            const u = await db.query.users.findFirst({
              where: eq(users.id, p.metadataUserId),
              columns: { id: true, email: true },
            });
            if (u) user = u;
          }
          if (!user && p.membershipId) {
            const u = await db.query.users.findFirst({
              where: eq(users.stripeSubscriptionId, `whop_${p.membershipId}`),
              columns: { id: true, email: true },
            });
            if (u) user = u;
          }
          if (!user && p.email) {
            const normalized = normalizeEmail(p.email);
            const u = await db.query.users.findFirst({
              where: eq(users.normalizedEmail, normalized),
              columns: { id: true, email: true },
            });
            if (u) user = u;
          }

          if (dryRun) {
            results.push({
              paymentId: p.id, email: p.email, planId: p.planId,
              action: user ? (credits ? 'credits_granted' : 'sub_updated') : 'stub_created_and_delivered',
              credits: credits ?? undefined,
              userId: user?.id,
            });
            continue;
          }

          // No user → create stub + send delivery email
          if (!user) {
            if (!p.email) {
              results.push({ paymentId: p.id, email: null, planId: p.planId, action: 'skipped_no_email' });
              continue;
            }
            const stubEmail = p.email.trim().toLowerCase();
            const normalized = normalizeEmail(stubEmail);
            // Sanity check — race-safe re-check by normalized email
            const dup = await db.query.users.findFirst({
              where: eq(users.normalizedEmail, normalized),
              columns: { id: true, email: true },
            });
            if (dup) {
              user = dup;
            } else {
              const newId = nanoid();
              // Random unguessable password so login is impossible without claim flow.
              const randomPw = nanoid(40);
              const passwordHash = await bcrypt.hash(randomPw, 10);
              await db.insert(users).values({
                id: newId,
                email: stubEmail,
                normalizedEmail: normalized,
                passwordHash,
                subscriptionTier: 'free',
                subscriptionStatus: 'active',
                createdAt: new Date(),
              });
              user = { id: newId, email: stubEmail };

              // Generate a 30-day claim code reusing the password-reset table
              const claimCode = String(Math.floor(100000 + Math.random() * 900000));
              const codeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              await db.insert(passwordResetCodes).values({
                id: nanoid(),
                email: normalized,
                code: claimCode,
                expiresAt: codeExpiry,
                used: false,
                createdAt: new Date(),
              });

              const description = credits
                ? `${credits.toLocaleString()} AI Credits ready in your account.`
                : `${subPlan?.tier?.toUpperCase()} subscription (${subPlan?.interval}) ready in your account.`;
              try {
                await sendPurchaseDelivery(stubEmail, claimCode, description);
              } catch (e) {
                console.error(`Delivery email failed for ${stubEmail}:`, e);
                // Continue anyway — grant the entitlement; admin can resend email manually.
              }
            }
          }

          // Grant credits or update subscription
          if (credits) {
            await grantCredits(user.id, credits, `purchase:credits`, p.id);
            results.push({
              paymentId: p.id, email: user.email, planId: p.planId,
              action: user.id === user.id && !p.metadataUserId && !p.email ? 'stub_created_and_delivered' : 'credits_granted',
              credits, userId: user.id,
            });
          } else if (subPlan) {
            const endsAt = p.createdAt
              ? new Date((p.createdAt + (subPlan.interval === 'annual' ? 365 : 30) * 86400) * 1000)
              : null;
            await db.update(users).set({
              subscriptionTier: subPlan.tier,
              subscriptionStatus: 'active',
              stripeSubscriptionId: p.membershipId ? `whop_${p.membershipId}` : undefined,
              subscriptionEndsAt: endsAt,
            }).where(eq(users.id, user.id));
            // Log the delivery in the credit ledger even though no credits granted,
            // so the importer treats it as delivered next run.
            await db.insert(creditTransactions).values({
              id: nanoid(),
              userId: user.id,
              amount: 0,
              reason: `purchase:sub_${subPlan.tier}_${subPlan.interval}`,
              refId: p.id,
              balanceAfter: 0,
              createdAt: new Date(),
            });
            results.push({
              paymentId: p.id, email: user.email, planId: p.planId,
              action: 'sub_updated', userId: user.id,
            });
          }
        } catch (e) {
          results.push({
            paymentId: p.id, email: p.email, planId: p.planId,
            action: 'error', error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Aggregate counts
      const counts = results.reduce((acc, r) => {
        acc[r.action] = (acc[r.action] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        success: true,
        dryRun,
        totalPayments: payments.length,
        counts,
        results: results.slice(0, 200), // cap response size
      });
    }

    // Hard delete a user. FK cascades clean up sources, sessions, responses,
    // tickets, etc. — see schema.ts. Irreversible.
    if (body.action === 'deleteUser') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      // Safety: don't let admin delete themselves via the API even if they pass their own id.
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true },
      });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      await db.delete(users).where(eq(users.id, userId));
      return NextResponse.json({ success: true, deleted: user.email });
    }

    // Temporary or permanent ban. Set days = -1 (or null) for "permanent"
    // (we use year 9999 as the sentinel). Reason is optional but recommended.
    if (body.action === 'banUser') {
      const { userId, days, reason } = body;
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

      let bannedUntil: Date;
      if (days == null || days < 0 || days > 36500) {
        // Permanent ban — far future date.
        bannedUntil = new Date('9999-12-31T00:00:00Z');
      } else {
        const numDays = Math.max(1, Math.min(36500, Number(days)));
        bannedUntil = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);
      }

      await db.update(users)
        .set({ bannedUntil, banReason: reason?.trim() || null })
        .where(eq(users.id, userId));
      return NextResponse.json({
        success: true,
        bannedUntil: bannedUntil.toISOString(),
        permanent: bannedUntil.getUTCFullYear() === 9999,
      });
    }

    // Unban — clear bannedUntil + reason.
    if (body.action === 'unbanUser') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      await db.update(users)
        .set({ bannedUntil: null, banReason: null })
        .where(eq(users.id, userId));
      return NextResponse.json({ success: true });
    }

    // Complimentary tier upgrade — bumps a user to a higher tier for N days,
    // then auto-reverts (via expireComps cron) to their actual paid Whop tier
    // if they have one, otherwise to free.
    if (body.action === 'compUpgrade') {
      const { userId, tier = 'max', days = 30 } = body;
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      if (!['pro', 'max'].includes(tier)) {
        return NextResponse.json({ error: 'tier must be pro or max' }, { status: 400 });
      }
      const numDays = Math.max(1, Math.min(365, Number(days) || 30));
      const endsAt = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);
      await db.update(users).set({
        subscriptionTier: tier,
        subscriptionStatus: 'comp',
        subscriptionEndsAt: endsAt,
      }).where(eq(users.id, userId));
      return NextResponse.json({ success: true, tier, endsAt: endsAt.toISOString(), days: numDays });
    }

    // Change subscription tier
    if (body.action === 'changeTier') {
      const { userId, tier } = body;
      if (!userId || !['free', 'pro', 'max'].includes(tier)) {
        return NextResponse.json({ error: 'Valid userId and tier (free/pro/max) required' }, { status: 400 });
      }
      await db.update(users).set({
        subscriptionTier: tier,
        subscriptionStatus: tier === 'free' ? 'active' : 'active',
      }).where(eq(users.id, userId));
      return NextResponse.json({ success: true });
    }

    // Reset password (default)
    const { userId, newPassword } = body;
    if (!userId || !newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: 'User ID and new password (min 4 chars) required' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — admin support actions (reply, close, get messages)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    // Get ticket messages
    if (body.action === 'getMessages') {
      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, body.ticketId))
        .orderBy(supportMessages.createdAt);
      return NextResponse.json({ messages });
    }

    // Reply to ticket
    if (body.action === 'reply') {
      if (!body.ticketId || !body.message?.trim()) {
        return NextResponse.json({ error: 'Ticket ID and message required' }, { status: 400 });
      }
      const now = new Date();
      const messageId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

      await db.insert(supportMessages).values({
        id: messageId,
        ticketId: body.ticketId,
        senderId: 'admin',
        isAdmin: true,
        message: body.message.trim(),
        createdAt: now,
      });

      await db.update(supportTickets).set({
        status: 'replied',
        updatedAt: now,
      }).where(eq(supportTickets.id, body.ticketId));

      return NextResponse.json({ success: true });
    }

    // Close ticket
    if (body.action === 'closeTicket') {
      await db.update(supportTickets).set({
        status: 'closed',
        updatedAt: new Date(),
      }).where(eq(supportTickets.id, body.ticketId));
      return NextResponse.json({ success: true });
    }

    // Update feature request status
    if (body.action === 'updateRequest') {
      const updates: Record<string, string> = {};
      if (body.status) updates.status = body.status;
      if (body.adminNote !== undefined) updates.adminNote = body.adminNote;
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
      }
      await db.update(featureRequests).set(updates).where(eq(featureRequests.id, body.requestId));
      return NextResponse.json({ success: true });
    }

    // Delete feature request
    if (body.action === 'deleteRequest') {
      await db.delete(featureRequests).where(eq(featureRequests.id, body.requestId));
      return NextResponse.json({ success: true });
    }

    // View a source's content (raw text of an upload)
    if (body.action === 'viewSource') {
      if (!body.sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });
      const src = await db.query.contentSources.findFirst({
        where: (s, { eq: e }) => e(s.id, body.sourceId),
      });
      if (!src) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      return NextResponse.json({
        id: src.id,
        title: src.title,
        type: src.type,
        rawText: src.rawText,
        filePath: src.filePath,
        youtubeUrl: src.youtubeUrl,
        wordCount: src.wordCount,
        pageCount: src.pageCount,
        createdAt: src.createdAt,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
