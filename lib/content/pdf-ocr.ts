import fs from 'fs/promises';
import { groq } from '../ai/client';

const VISION_MODEL = 'llama-4-scout-17b-16e-instruct';

/**
 * Convert PDF pages to PNG buffers using pdfjs-dist + canvas.
 */
async function pdfToImages(filePath: string): Promise<Buffer[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const { createCanvas } = await import('canvas');
  const images: Buffer[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 2x for better OCR
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    // pdfjs render expects a specific context shape
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    images.push(canvas.toBuffer('image/png'));
  }

  await doc.destroy();
  return images;
}

/**
 * Use Groq vision to extract text from a PDF page image.
 */
async function ocrImage(imageBuffer: Buffer): Promise<string> {
  const base64 = imageBuffer.toString('base64');

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extract ALL text from this image exactly as written. Preserve the numbering, question format, and answer options (a, b, c, d). Do NOT summarize or skip anything. Output only the extracted text, nothing else.',
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

/**
 * OCR a full PDF: converts pages to images, then uses Groq vision to extract text.
 * Returns the concatenated text from all pages.
 */
export async function ocrPdf(filePath: string): Promise<string> {
  const images = await pdfToImages(filePath);

  // Process pages sequentially to avoid rate limits
  const pages: string[] = [];
  for (const img of images) {
    const text = await ocrImage(img);
    if (text.trim()) pages.push(text.trim());
  }

  return pages.join('\n\n');
}
