import { NextRequest, NextResponse } from 'next/server';
import { callLLMJSON } from '@/lib/ai/generators';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Mexiz1924';

const BLOG_SYSTEM = `You are the content lead for MedStudy (medstudy.space), an AI-powered study platform for medical students preparing for USMLE, PLAB, UKMLA, AMC, and MCCQE.

You write SEO blog posts that rank on Google and convert readers into signups. Your writing is:
- Genuinely helpful and specific — real study advice, not fluff. Google rewards depth (E-E-A-T).
- Medically responsible — never state clinical facts you're unsure of; keep medical claims general and correct. The reader is a future doctor.
- Honest in comparisons — acknowledge competitors' real strengths, then show where MedStudy fits. Never fabricate features or make false claims about other products.
- Written in a warm, peer-to-peer voice (a smart senior student talking to a junior), UK/US-neutral.
- Naturally optimized — the target keyword appears in the title, first paragraph, and 2-3 H2 headings, but never keyword-stuffed.

MedStudy's real features (only reference these): upload notes/PDFs -> instantly generate MCQs, flashcards, fill-in-the-blank, and clinical cases; an AI tutor; spaced-repetition; analytics; study rooms; Exam Lab (generates questions in your university's exam style). Free plan available; Pro and Max paid tiers.

Return ONLY valid JSON — no markdown fences, no commentary.`;

function blogUserPrompt(topic: string, kind: string, keyword: string): string {
  const kindGuide: Record<string, string> = {
    'how-to': 'A practical how-to guide with numbered, actionable steps.',
    comparison: 'An honest head-to-head comparison. Include a short pros/cons list for each option. Be fair to the competitor.',
    listicle: 'A useful list post (e.g. "7 ways to..."). Each item should have a real, substantive paragraph.',
    guide: 'An in-depth guide that fully answers the search intent.',
  };
  return `Write a blog post for MedStudy.

TOPIC: ${topic}
TARGET SEARCH KEYWORD: ${keyword || topic}
POST TYPE: ${kindGuide[kind] ?? kindGuide.guide}

Requirements:
- 900-1400 words of genuinely useful content.
- Body in clean Markdown: ## and ### headings, short paragraphs, bullet lists, and **bold** for emphasis. Do NOT include an H1 (the title renders separately).
- Open with a 2-3 sentence hook that states the reader's problem and what they'll get.
- Include one naturally-placed mention of how MedStudy helps, and end with a short call-to-action linking to https://www.medstudy.space (markdown link).
- Meta description: 150-160 characters, compelling, includes the keyword.

Return this exact JSON:
{
  "title": "SEO title under 60 chars, includes the keyword, compelling",
  "description": "150-160 char meta description",
  "slug": "kebab-case-url-slug-from-the-title",
  "tags": ["4-6 relevant lowercase tags"],
  "coverEmoji": "a single relevant emoji",
  "bodyMarkdown": "the full post body in markdown"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }
    const topic: string = (body.topic ?? '').trim();
    const keyword: string = (body.keyword ?? '').trim();
    const kind: string = (body.kind ?? 'guide').trim();
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

    const draft = await callLLMJSON<{
      title: string; description: string; slug: string;
      tags: string[]; coverEmoji: string; bodyMarkdown: string;
    }>(BLOG_SYSTEM, blogUserPrompt(topic, kind, keyword), 5000);

    // Assemble the ready-to-commit .md file content with frontmatter.
    const today = new Date().toISOString().split('T')[0];
    const slug = (draft.slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 80);
    const tags = Array.isArray(draft.tags) ? draft.tags : [];
    const frontmatter = [
      '---',
      `title: ${JSON.stringify(draft.title)}`,
      `description: ${JSON.stringify(draft.description)}`,
      `date: ${JSON.stringify(today)}`,
      'author: "MedStudy Team"',
      `tags: ${JSON.stringify(tags)}`,
      `coverEmoji: ${JSON.stringify(draft.coverEmoji || '📖')}`,
      '---',
      '',
    ].join('\n');
    const fileContent = frontmatter + (draft.bodyMarkdown ?? '').trim() + '\n';

    return NextResponse.json({
      slug,
      filename: `${slug}.md`,
      title: draft.title,
      description: draft.description,
      fileContent,
    });
  } catch (error) {
    console.error('Blog generate error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
