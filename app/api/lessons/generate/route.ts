import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { groq, MODEL } from '@/lib/ai/client';
import { fetchMedicalDiagram } from '@/lib/ai/diagrams';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { checkUsageLimit, incrementUsage, getUserTier, hasFeature } from '@/lib/subscription';
export const dynamic = 'force-dynamic';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a medical education expert. Generate a comprehensive lesson in JSON format.

REQUIRED JSON STRUCTURE (return ONLY valid JSON):
{
  "title": "Full descriptive lesson title",
  "overview": "2-3 sentence introduction",
  "sections": [
    {
      "heading": "Section title",
      "explanation": "3-5 sentence explanation",
      "wikiSearch": "short specific medical search term for finding a labeled anatomy diagram",
      "svgCode": "<svg viewBox='0 0 800 400' xmlns='http://www.w3.org/2000/svg' width='100%' height='auto'>...</svg>",
      "keyPoints": ["key point 1", "key point 2", "key point 3"]
    }
  ],
  "summary": "2-3 sentence recap",
  "clinicalRelevance": "2-3 sentences on clinical importance"
}

SEARCH TERM RULES (critical):
- wikiSearch = 2-4 word specific medical term to image-search for a labeled anatomy diagram
- Each section must have a DIFFERENT, MORE SPECIFIC search term than the others
- Examples: "phospholipid bilayer structure", "integral membrane protein", "sodium potassium pump", "glomerulus anatomy", "loop of henle", "cardiac action potential"
- Avoid generic terms — be as specific as the section concept

SVG RULES (fallback only):
- viewBox="0 0 800 400" width="100%" height="auto"
- Background: <rect width="800" height="400" fill="#fefce8" rx="8"/>
- Label all elements; professional colors #3b82f6 #10b981 #f59e0b #8b5cf6 #ef4444

Create exactly 3 sections.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const tier = await getUserTier(userId);
    if (!hasFeature(tier, 'lesson_generate')) {
      return NextResponse.json({ error: 'AI Lesson Generator is available on Pro and Max plans', upgradeRequired: true, requiredTier: 'pro' }, { status: 403 });
    }

    const { allowed, used, limit } = await checkUsageLimit(userId, 'lesson_generate', tier);
    if (!allowed) {
      return NextResponse.json({ error: 'Daily lesson generation limit reached', upgradeRequired: true, used, limit, tier }, { status: 429 });
    }

    const { topic } = await req.json();
    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 10000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a comprehensive medical lesson about: ${topic.trim()}` },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    if (!parsed.title || !Array.isArray(parsed.sections)) {
      return NextResponse.json({ error: 'Invalid lesson structure from AI' }, { status: 500 });
    }

    type RawSection = { heading: string; wikiSearch?: string; [key: string]: unknown };
    const sectionsWithImages = await Promise.all(
      parsed.sections.map(async (section: RawSection) => {
        const searchTerm = section.wikiSearch || `${topic} ${section.heading}`;
        const imageUrl = await fetchMedicalDiagram(searchTerm);
        return { ...section, imageUrl: imageUrl ?? undefined };
      })
    );

    const id = nanoid();
    const now = new Date();

    await incrementUsage(userId, 'lesson_generate');

    await db.insert(lessons).values({
      id,
      userId,
      title: parsed.title,
      topic: topic.trim(),
      overview: parsed.overview ?? '',
      sections: JSON.stringify(sectionsWithImages),
      summary: parsed.summary ?? '',
      clinicalRelevance: parsed.clinicalRelevance ?? '',
      createdAt: now,
    });

    return NextResponse.json({
      lesson: {
        id,
        title: parsed.title,
        topic: topic.trim(),
        overview: parsed.overview ?? '',
        sections: sectionsWithImages,
        summary: parsed.summary ?? '',
        clinicalRelevance: parsed.clinicalRelevance ?? '',
        createdAt: now,
      },
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('Lesson generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
