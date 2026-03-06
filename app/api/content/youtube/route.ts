import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentSources } from '@/db/schema';
import { extractYoutubeTranscript } from '@/lib/content/youtube-extractor';
import { nanoid } from 'nanoid';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const body = await req.json();
    const { url, title, subject, topic, manualText } = body;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    let text: string;
    let wordCount: number;
    let videoId: string | null = null;

    if (manualText && manualText.trim().length > 0) {
      // Use manually pasted transcript
      text = manualText.trim();
      wordCount = text.split(/\s+/).filter(Boolean).length;
      // Still try to extract videoId from URL for reference
      if (url) {
        try {
          const result = await import('@/lib/content/youtube-extractor');
          // Just extract the ID without fetching (we already have text)
          const patterns = [
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
          ];
          for (const p of patterns) {
            const m = url.match(p);
            if (m) { videoId = m[1]; break; }
          }
        } catch { /* ignore */ }
      }
    } else if (url) {
      // Auto-fetch transcript from YouTube
      const result = await extractYoutubeTranscript(url);
      text = result.text;
      wordCount = result.wordCount;
      videoId = result.videoId;
    } else {
      return NextResponse.json({ error: 'Provide a YouTube URL or paste the transcript text.' }, { status: 400 });
    }

    if (!text || wordCount < 10) {
      return NextResponse.json({ error: 'Transcript is too short or empty.' }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date();

    await db.insert(contentSources).values({
      id,
      userId,
      type: 'youtube',
      title,
      subject: subject || null,
      topic: topic || null,
      youtubeUrl: url || null,
      youtubeId: videoId || null,
      rawText: text,
      wordCount,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id, title, wordCount, videoId });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error('YouTube error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
