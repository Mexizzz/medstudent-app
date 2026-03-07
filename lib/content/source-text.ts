import { extractPdfPageRange } from './pdf-extractor';

interface Source {
  rawText: string | null;
  filePath: string | null;
  type: string;
}

/**
 * Get text content from a source, optionally filtered to a page range.
 * When pageFrom/pageTo are provided and the source has a filePath (PDF),
 * re-extracts text from only those pages.
 */
export async function getSourceText(
  source: Source,
  pageFrom?: number,
  pageTo?: number
): Promise<string> {
  if (pageFrom && pageTo && source.filePath && (source.type === 'pdf' || source.type === 'mcq_pdf')) {
    return extractPdfPageRange(source.filePath, pageFrom, pageTo);
  }
  return source.rawText ?? '';
}
