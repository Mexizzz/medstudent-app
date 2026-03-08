import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { groq } from '../ai/client';

const execFileAsync = promisify(execFile);
const VISION_MODEL = 'llama-4-scout-17b-16e-instruct';

/**
 * Convert PDF pages to PNG files using pdftoppm (poppler-utils).
 * Returns array of PNG file paths.
 */
async function pdfToImages(filePath: string): Promise<string[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
  const outputPrefix = path.join(tmpDir, 'page');

  await execFileAsync('pdftoppm', [
    '-png',
    '-r', '200', // 200 DPI — good enough for OCR
    filePath,
    outputPrefix,
  ]);

  // pdftoppm outputs page-01.png, page-02.png, etc.
  const files = await fs.readdir(tmpDir);
  const pngFiles = files
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(tmpDir, f));

  return pngFiles;
}

/**
 * Use Groq vision to extract text from a PDF page image.
 */
async function ocrImage(imagePath: string): Promise<string> {
  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString('base64');

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
 * OCR a full PDF: converts pages to images via pdftoppm, then uses Groq vision to extract text.
 */
export async function ocrPdf(filePath: string): Promise<string> {
  const imagePaths = await pdfToImages(filePath);

  const pages: string[] = [];
  for (const imgPath of imagePaths) {
    const text = await ocrImage(imgPath);
    if (text.trim()) pages.push(text.trim());
  }

  // Cleanup temp files
  for (const imgPath of imagePaths) {
    await fs.unlink(imgPath).catch(() => {});
  }
  const tmpDir = path.dirname(imagePaths[0] ?? '');
  if (tmpDir) await fs.rmdir(tmpDir).catch(() => {});

  return pages.join('\n\n');
}
