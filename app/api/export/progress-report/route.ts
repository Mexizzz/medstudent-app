import { NextResponse } from 'next/server';
import { db } from '@/db';
import { topicPerformance, studySessions, users } from '@/db/schema';
import { sql, desc, eq, and, gte } from 'drizzle-orm';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Helper: draw a simple horizontal bar
function drawBar(
  page: ReturnType<PDFDocument['addPage']>,
  x: number, y: number,
  width: number, fillWidth: number,
  height = 10,
  bgColor = rgb(0.9, 0.93, 0.97),
  fgColor = rgb(0.24, 0.52, 0.96),
) {
  page.drawRectangle({ x, y, width, height, color: bgColor, borderColor: bgColor });
  if (fillWidth > 0) {
    page.drawRectangle({ x, y, width: Math.min(fillWidth, width), height, color: fgColor });
  }
}

export async function GET() {
  try {
    const { userId } = await requireAuth();

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    // Pull last 30 days of data
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [topics, sessions] = await Promise.all([
      db.select().from(topicPerformance).where(eq(topicPerformance.userId, userId)),
      db.select({
        id: studySessions.id,
        score: studySessions.score,
        startedAt: studySessions.startedAt,
        totalQuestions: studySessions.totalQuestions,
        correctCount: studySessions.correctCount,
        mode: studySessions.mode,
      })
        .from(studySessions)
        .where(and(eq(studySessions.userId, userId), sql`${studySessions.status} = 'completed'`))
        .orderBy(desc(studySessions.startedAt))
        .limit(100),
    ]);

    const recentSessions = sessions.filter(s => s.startedAt && new Date(s.startedAt) >= since);
    const totalSessions = recentSessions.length;
    const totalQuestions = recentSessions.reduce((s, r) => s + (r.totalQuestions ?? 0), 0);
    const totalCorrect = recentSessions.reduce((s, r) => s + (r.correctCount ?? 0), 0);
    const overallAcc = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Streak calculation (consecutive days with sessions)
    const sessionDays = new Set(
      sessions
        .map(s => s.startedAt ? new Date(s.startedAt).toDateString() : null)
        .filter(Boolean)
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (sessionDays.has(d.toDateString())) streak++;
      else break;
    }

    const weakTopics = topics
      .filter(t => (t.totalAttempts ?? 0) >= 3)
      .sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0))
      .slice(0, 5);

    const strongTopics = topics
      .filter(t => (t.totalAttempts ?? 0) >= 3)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
      .slice(0, 5);

    // ── Build PDF ────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 50;
    const COL_W = PAGE_W - MARGIN * 2;

    const blue = rgb(0.24, 0.52, 0.96);
    const darkBlue = rgb(0.07, 0.23, 0.54);
    const lightBlue = rgb(0.9, 0.93, 0.97);
    const green = rgb(0.13, 0.77, 0.47);
    const red = rgb(0.95, 0.33, 0.33);
    const gray = rgb(0.45, 0.55, 0.65);
    const darkGray = rgb(0.15, 0.2, 0.28);
    const white = rgb(1, 1, 1);

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 40;

    function ensureSpace(needed: number) {
      if (y - needed < 50) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 40;
      }
    }

    function text(t: string, x: number, yPos: number, opts: {
      font?: typeof helvetica;
      size?: number;
      color?: ReturnType<typeof rgb>;
    } = {}) {
      page.drawText(t, {
        x, y: yPos,
        font: opts.font ?? helvetica,
        size: opts.size ?? 11,
        color: opts.color ?? darkGray,
      });
    }

    // ── Header bar ─────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: darkBlue });
    text('MedStudy', MARGIN, PAGE_H - 35, { font: helveticaBold, size: 22, color: white });
    text('AI', MARGIN + 115, PAGE_H - 35, { font: helveticaBold, size: 10, color: blue });

    const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    text(`Progress Report — ${monthLabel}`, MARGIN, PAGE_H - 58, { size: 12, color: rgb(0.7, 0.82, 1) });

    const nameLabel = user?.name ?? user?.email ?? 'Student';
    const nameWidth = helveticaBold.widthOfTextAtSize(nameLabel, 12);
    text(nameLabel, PAGE_W - MARGIN - nameWidth, PAGE_H - 58, { font: helveticaBold, size: 12, color: white });

    y = PAGE_H - 100;

    // ── Overview stats ──────────────────────────────────────────────────────
    ensureSpace(80);
    text('30-Day Overview', MARGIN, y, { font: helveticaBold, size: 14, color: darkBlue });
    y -= 20;

    const statW = (COL_W - 30) / 4;
    const stats = [
      { label: 'Sessions', value: String(totalSessions) },
      { label: 'Questions', value: String(totalQuestions) },
      { label: 'Accuracy', value: `${overallAcc}%` },
      { label: 'Day Streak', value: `${streak}` },
    ];

    for (let i = 0; i < stats.length; i++) {
      const sx = MARGIN + i * (statW + 10);
      page.drawRectangle({ x: sx, y: y - 42, width: statW, height: 52, color: lightBlue, borderColor: rgb(0.8, 0.87, 0.97) });
      const valWidth = helveticaBold.widthOfTextAtSize(stats[i].value, 20);
      text(stats[i].value, sx + (statW - valWidth) / 2, y - 15, { font: helveticaBold, size: 20, color: blue });
      const labWidth = helvetica.widthOfTextAtSize(stats[i].label, 9);
      text(stats[i].label, sx + (statW - labWidth) / 2, y - 33, { size: 9, color: gray });
    }

    y -= 65;

    // ── Recent performance trend (last 10 sessions as mini bars) ────────────
    if (recentSessions.length > 0) {
      ensureSpace(100);
      text('Recent Sessions (last 10)', MARGIN, y, { font: helveticaBold, size: 13, color: darkBlue });
      y -= 18;

      const bars = recentSessions.slice(0, 10).reverse();
      const barW = Math.floor(COL_W / bars.length) - 4;
      const BAR_H = 50;

      for (let i = 0; i < bars.length; i++) {
        const s = bars[i];
        const acc = (s.totalQuestions ?? 0) > 0 ? (s.correctCount ?? 0) / (s.totalQuestions ?? 1) : 0;
        const barFill = Math.round(acc * BAR_H);
        const bx = MARGIN + i * (barW + 4);

        // Background
        page.drawRectangle({ x: bx, y: y - BAR_H, width: barW, height: BAR_H, color: lightBlue });
        // Fill
        const fillColor = acc >= 0.75 ? green : acc >= 0.5 ? blue : red;
        page.drawRectangle({ x: bx, y: y - BAR_H, width: barW, height: barFill, color: fillColor });
        // Pct label
        const pct = `${Math.round(acc * 100)}%`;
        const pw = helvetica.widthOfTextAtSize(pct, 7);
        text(pct, bx + (barW - pw) / 2, y - BAR_H - 11, { size: 7, color: gray });
      }
      y -= BAR_H + 24;
    }

    // ── Weak topics ─────────────────────────────────────────────────────────
    if (weakTopics.length > 0) {
      ensureSpace(weakTopics.length * 26 + 40);
      page.drawRectangle({ x: MARGIN, y: y - 22, width: COL_W / 2 - 10, height: 24, color: rgb(1, 0.94, 0.94) });
      text('Needs Work', MARGIN + 8, y - 8, { font: helveticaBold, size: 12, color: red });
      y -= 30;

      for (const t of weakTopics) {
        ensureSpace(24);
        const score = Math.round(t.avgScore ?? 0);
        const label = (t.topic ?? 'Unknown').substring(0, 32);
        text(label, MARGIN + 4, y - 4, { size: 9, color: darkGray });
        text(`${score}%`, MARGIN + COL_W / 2 - 40, y - 4, { font: helveticaBold, size: 9, color: red });
        drawBar(page, MARGIN, y - 18, COL_W / 2 - 8, (score / 100) * (COL_W / 2 - 8), 8, rgb(0.98, 0.92, 0.92), red);
        y -= 26;
      }
    }

    y -= 10;

    // ── Strong topics ────────────────────────────────────────────────────────
    if (strongTopics.length > 0) {
      ensureSpace(strongTopics.length * 26 + 40);
      page.drawRectangle({ x: MARGIN, y: y - 22, width: COL_W / 2 - 10, height: 24, color: rgb(0.9, 0.97, 0.93) });
      text('Strengths', MARGIN + 8, y - 8, { font: helveticaBold, size: 12, color: green });
      y -= 30;

      for (const t of strongTopics) {
        ensureSpace(24);
        const score = Math.round(t.avgScore ?? 0);
        const label = (t.topic ?? 'Unknown').substring(0, 32);
        text(label, MARGIN + 4, y - 4, { size: 9, color: darkGray });
        text(`${score}%`, MARGIN + COL_W / 2 - 40, y - 4, { font: helveticaBold, size: 9, color: green });
        drawBar(page, MARGIN, y - 18, COL_W / 2 - 8, (score / 100) * (COL_W / 2 - 8), 8, rgb(0.92, 0.98, 0.94), green);
        y -= 26;
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const lastPage = pdfDoc.getPages().at(-1)!;
    lastPage.drawLine({ start: { x: MARGIN, y: 45 }, end: { x: PAGE_W - MARGIN, y: 45 }, color: lightBlue, thickness: 1 });
    lastPage.drawText('Generated by MedStudy — AI-Powered Medical Study Platform', {
      x: MARGIN, y: 28, font: helvetica, size: 8, color: gray,
    });
    lastPage.drawText(`medstudy.space`, {
      x: PAGE_W - MARGIN - 70, y: 28, font: helveticaBold, size: 8, color: blue,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="medstudy-progress-${monthLabel.replace(' ', '-')}.pdf"`,
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Progress report error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
