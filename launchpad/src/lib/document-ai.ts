import { extractPdfText, truncateText } from "@/lib/pdf-extract";
import {
  generateJSON,
  generateTextWithFile,
  isGeminiConfigured,
  LONG_CONTEXT_MODEL,
} from "@/lib/vertex-ai";
import { groqJSON, groqVisionJSON, groqVisionText, isGroqConfigured } from "@/lib/groq";

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function normalizeDocumentMimeType(mimeType: string | null | undefined) {
  if (!mimeType) return "";
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

export function isSupportedDocumentMimeType(mimeType: string) {
  return mimeType === "application/pdf" || IMAGE_MIME_TYPES.has(mimeType);
}

export function isImageMimeType(mimeType: string) {
  return IMAGE_MIME_TYPES.has(mimeType);
}

/**
 * Extract readable text from a document buffer.
 *
 * Strategy:
 *  1. PDF → pdf-parse (fast, no AI needed)
 *  2. Image or scanned PDF → Groq vision OCR (fast)
 *  3. Fallback → Gemini OCR (if Groq not configured)
 */
export async function extractDocumentText(
  fileBuffer: Buffer,
  mimeType: string,
  options?: { minCharacters?: number; preferOcr?: boolean }
) {
  const minChars = options?.minCharacters ?? 25;
  const normalizedMime = normalizeDocumentMimeType(mimeType);
  const isPdf = normalizedMime === "application/pdf";
  const isImage = isImageMimeType(normalizedMime);

  // ── Step 1: Try pdf-parse for PDFs ──────────────────────────────────────────
  if (isPdf && !options?.preferOcr) {
    const extracted = await extractPdfText(fileBuffer);
    if (extracted.length >= minChars) {
      return truncateText(extracted);
    }
  }

  // ── Step 2: Vision OCR (Groq preferred, Gemini fallback) ────────────────────
  if (isImage || isPdf) {
    const base64 = fileBuffer.toString("base64");

    // For scanned PDFs we can't send as image directly — fall through to Gemini
    if (isImage && isGroqConfigured()) {
      const ocrText = await groqVisionText(
        "Extract all readable text from this document exactly as it appears. Preserve numbers, dates, names, and totals. Return plain text only, no formatting.",
        base64,
        normalizedMime
      );
      if (ocrText.trim().length >= minChars) {
        return truncateText(ocrText.trim());
      }
    }

    if (isGeminiConfigured()) {
      const ocrText = await generateTextWithFile(
        `Extract all readable text from this business document.

Return plain text only.
- Preserve clause numbers, headings, payment terms, dates, totals, and party names.
- Preserve table rows as line-based text where possible.
- Do not summarize, explain, or format as markdown.`,
        { data: base64, mimeType: normalizedMime },
        LONG_CONTEXT_MODEL
      );
      if (ocrText.trim().length >= minChars) {
        return truncateText(ocrText.trim());
      }
    }
  }

  // ── Step 3: Retry pdf-parse for preferOcr case ──────────────────────────────
  if (isPdf && options?.preferOcr) {
    const extracted = await extractPdfText(fileBuffer);
    if (extracted.length >= minChars) {
      return truncateText(extracted);
    }
  }

  throw new Error(
    "Could not extract enough readable text from this document. " +
      (!isGroqConfigured() && !isGeminiConfigured()
        ? "Set OPENROUTER_API_KEY (or GROQ_API_KEY) to enable OCR."
        : "Try uploading a clearer scan.")
  );
}

/**
 * Analyze an image document directly with Groq vision in a single API call
 * (no separate OCR step — faster and more accurate for receipts/image contracts).
 * Returns null if Groq is not configured or the document is not an image.
 */
export async function analyzeImageWithGroqVision<T>(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<T | null> {
  if (!isGroqConfigured() || !isImageMimeType(mimeType)) return null;
  const base64 = fileBuffer.toString("base64");
  return groqVisionJSON<T>(prompt, base64, mimeType);
}

/**
 * Route text generation to Groq (preferred) or Gemini.
 */
export async function generatePreferredJSON<T>(
  prompt: string,
  options?: { geminiModel?: string }
) {
  if (isGroqConfigured()) {
    return groqJSON<T>(prompt);
  }
  return generateJSON<T>(prompt, options?.geminiModel);
}
