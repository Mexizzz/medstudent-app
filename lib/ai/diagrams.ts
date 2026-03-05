/**
 * Medical diagram fetching.
 *
 * Priority:
 *  1. Google Custom Search Image API  (best — searches entire web, finds labeled diagrams)
 *  2. Wikimedia Commons               (free fallback — good SVG medical illustrations)
 *  3. Wikipedia article thumbnail     (last resort)
 */

const UA = { 'User-Agent': 'MedStudyApp/1.0 (educational)' };

// ── Google Custom Search ──────────────────────────────────────────────────────

async function fetchGoogleImage(searchTerm: string): Promise<string | null> {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx  = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return null;

  try {
    const query = `${searchTerm} medical diagram labeled illustration`;
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', key);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '10');
    url.searchParams.set('imgSize', 'large');
    url.searchParams.set('safe', 'active');

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn('Google image search failed:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const items: Array<{ link: string; image: { width: number; height: number } }> =
      data.items ?? [];

    console.log(`Google image search "${query}" → ${items.length} results`, items.map(i => i.link));

    // Pick first image large enough and not a tiny icon
    for (const item of items) {
      if (item.image.width >= 400 && item.image.height >= 300) {
        return item.link;
      }
    }
    return items[0]?.link ?? null;
  } catch (e) {
    console.warn('Google image search error:', e);
    return null;
  }
}

// ── Wikimedia Commons ─────────────────────────────────────────────────────────

interface CommonsPage {
  imageinfo?: Array<{ url: string; thumburl?: string }>;
}

async function fetchCommonsImage(searchTerm: string): Promise<string | null> {
  try {
    const commonsRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm + ' anatomy diagram')}&srnamespace=6&format=json&srlimit=10`,
      { headers: UA }
    );
    const commonsData = await commonsRes.json();
    const files: Array<{ title: string }> = commonsData.query?.search ?? [];

    // Score and filter files — prefer labeled English diagrams
    const scored = files
      .filter(f => {
        const l = f.title.toLowerCase();
        return (
          /\.(svg|png|jpg|jpeg)$/i.test(f.title) &&
          !l.includes('flag') && !l.includes('icon') && !l.includes('logo') &&
          !l.includes('map') && !l.includes('portrait') && !l.includes('photo')
        );
      })
      .map(f => {
        const l = f.title.toLowerCase();
        const term = searchTerm.toLowerCase();
        let score = 0;
        if (l.includes(term)) score += 10;
        if (l.includes('diagram')) score += 4;
        if (l.includes('labeled') || l.includes('labelled')) score += 3;
        if (l.includes('_en') || l.includes(' en.')) score += 2; // English-labeled
        if (l.includes('anatomy')) score += 2;
        if (l.endsWith('.svg')) score += 1; // SVGs render as clean PNGs
        return { ...f, score };
      })
      .sort((a, b) => b.score - a.score);

    for (const file of scored) {
      try {
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file.title)}&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json`,
          { headers: UA }
        );
        const infoData = await infoRes.json();
        const pages = Object.values(infoData.query?.pages ?? {}) as CommonsPage[];
        const info = pages[0]?.imageinfo?.[0];
        const imgUrl = info?.thumburl ?? info?.url;
        if (imgUrl) return imgUrl;
      } catch { continue; }
    }
  } catch { /* fall through */ }

  return null;
}

// ── Wikipedia article thumbnail ───────────────────────────────────────────────

interface WikiPage {
  thumbnail?: { source: string };
}

async function fetchWikipediaThumb(searchTerm: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=5&srnamespace=0`,
      { headers: UA }
    );
    const searchData = await searchRes.json();
    const results: Array<{ title: string }> = searchData.query?.search ?? [];

    for (const result of results) {
      const imgRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&pithumbsize=900`,
        { headers: UA }
      );
      const imgData = await imgRes.json();
      const pages = Object.values(imgData.query?.pages ?? {}) as WikiPage[];
      const src = pages[0]?.thumbnail?.source;
      if (src && !src.includes('Flag_of') && !src.includes('OOjs') && !src.includes('symbol')) {
        return src;
      }
    }
  } catch { /* fall through */ }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchMedicalDiagram(searchTerm: string): Promise<string | null> {
  return (
    (await fetchGoogleImage(searchTerm)) ??
    (await fetchCommonsImage(searchTerm)) ??
    (await fetchWikipediaThumb(searchTerm))
  );
}
