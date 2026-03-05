import fs from 'fs/promises';

export interface PdfExtractResult {
  text: string;
  wordCount: number;
  pageCount: number;
}

export async function extractPdfText(filePath: string): Promise<PdfExtractResult> {
  const buffer = await fs.readFile(filePath);
  // pdf-parse v2 uses a class-based API: new PDFParse({ data: buffer })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { PDFParse } = await import('pdf-parse') as any;
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy().catch(() => {});

  const raw = result.text as string;
  const text = raw
    .replace(/\f/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Count page breaks (form feeds) as a proxy for page count
  const pageCount = (raw.match(/\f/g)?.length ?? 0) + 1;

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    pageCount,
  };
}

export async function savePdfFile(
  fileBuffer: ArrayBuffer,
  uploadsDir: string
): Promise<string> {
  const { nanoid } = await import('nanoid');
  await fs.mkdir(uploadsDir, { recursive: true });
  const fileName = `${nanoid()}.pdf`;
  const filePath = `${uploadsDir}/${fileName}`;
  await fs.writeFile(filePath, Buffer.from(fileBuffer));
  return filePath;
}
