export interface YoutubeExtractResult {
  text: string;
  wordCount: number;
  videoId: string;
  title?: string;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,  // raw video ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractYoutubeTranscript(url: string): Promise<YoutubeExtractResult> {
  const videoId = extractVideoId(url.trim());
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube link.');
  }

  const { YoutubeTranscript } = await import('youtube-transcript');

  // Try multiple languages in order — Arabic first for Arabic medical lectures,
  // then English, then no preference (accepts any available language)
  const langCandidates = ['ar', 'en', undefined];
  let segments: Array<{ text: string }> | null = null;
  let lastError: unknown;

  for (const lang of langCandidates) {
    try {
      const config = lang ? { lang } : {};
      segments = await YoutubeTranscript.fetchTranscript(videoId, config);
      if (segments && segments.length > 0) break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!segments || segments.length === 0) {
    console.error('YouTube transcript error:', lastError);
    throw new Error(
      'No transcript found for this video. Make sure the video has captions ' +
      '(auto-generated or manual). Some videos have captions disabled by the uploader.'
    );
  }

  const text = segments
    .map(s => s.text)
    .join(' ')
    .replace(/\[.*?\]/g, '')    // remove [Music], [Applause], etc.
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    videoId,
  };
}
