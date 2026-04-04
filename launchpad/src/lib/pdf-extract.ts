/**
 * PDF text extraction — server-side only.
 * Extracts raw text from a PDF buffer so it can be sent to Groq (text-only LLM).
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid bundling issues with Next.js edge runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buffer: Buffer,
    options?: { max?: number }
  ) => Promise<{ text: string; numpages: number }>;

  const result = await pdfParse(buffer, { max: 100 }); // cap at 100 pages
  return result.text.trim();
}

/**
 * Truncate extracted text to a safe token budget.
 * Groq llama-3.3-70b has a 128k context window.
 * ~4 chars per token → 100k tokens ≈ 400k chars. We cap at 300k to be safe.
 */
export function truncateText(text: string, maxChars = 300_000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Document truncated — first 300,000 characters shown]";
}
