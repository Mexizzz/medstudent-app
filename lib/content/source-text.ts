import fs from 'fs/promises';
import { extractPdfPageRange } from './pdf-extractor';

interface Source {
  rawText: string | null;
  filePath: string | null;
  type: string;
}

/**
 * Get text content from a source, optionally filtered to a page range.
 *
 * Strategy when a page range is requested:
 *   1. If filePath exists AND the file is reachable → re-extract from disk
 *      (most accurate, uses pdf-parse with the requested page slice).
 *   2. Else if rawText contains form-feed page break markers → slice the
 *      cached text by page. Works for sources whose original PDF was lost
 *      from disk but whose extracted text is still in the DB.
 *   3. Else fall back to the full rawText. Logs a warning so this case is
 *      visible in Railway logs — it means the page range was silently
 *      ignored.
 */
export async function getSourceText(
  source: Source,
  pageFrom?: number,
  pageTo?: number,
): Promise<string> {
  if (pageFrom && pageTo && (source.type === 'pdf' || source.type === 'mcq_pdf')) {
    // Path 1: re-extract from disk if the file is still there
    if (source.filePath) {
      try {
        await fs.access(source.filePath);
        return await extractPdfPageRange(source.filePath, pageFrom, pageTo);
      } catch (e) {
        console.warn(`getSourceText: filePath ${source.filePath} not accessible (${e instanceof Error ? e.message : e}); falling back to rawText slicing`);
      }
    } else {
      console.warn(`getSourceText: source has no filePath; falling back to rawText slicing for ${source.type}`);
    }

    // Path 2: slice rawText by form-feed page breaks
    if (source.rawText && source.rawText.includes('\f')) {
      const pages = source.rawText.split('\f');
      const from = Math.max(0, pageFrom - 1);
      const to = Math.min(pages.length, pageTo);
      const slice = pages.slice(from, to).join('\n\n').trim();
      if (slice) return slice;
      console.warn(`getSourceText: rawText page slice ${pageFrom}-${pageTo} was empty; falling back to full rawText`);
    } else if (source.rawText) {
      // PDF was extracted without preserving page breaks — can't slice
      console.warn(`getSourceText: rawText has no \\f page break markers; page range ${pageFrom}-${pageTo} cannot be applied — returning full rawText`);
    }
  }

  return source.rawText ?? '';
}
