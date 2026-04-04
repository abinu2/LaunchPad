import { extractPdfText, truncateText } from "@/lib/pdf-extract";
import {
  generateJSON,
  generateTextWithFile,
  isGeminiConfigured,
  LONG_CONTEXT_MODEL,
} from "@/lib/vertex-ai";
import { groqJSON, isGroqConfigured } from "@/lib/groq";

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function normalizeDocumentMimeType(mimeType: string | null | undefined) {
  if (!mimeType) {
    return "";
  }

  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

export function isSupportedDocumentMimeType(mimeType: string) {
  return mimeType === "application/pdf" || IMAGE_MIME_TYPES.has(mimeType);
}

export function isImageMimeType(mimeType: string) {
  return IMAGE_MIME_TYPES.has(mimeType);
}

export async function extractDocumentText(
  fileBuffer: Buffer,
  mimeType: string,
  options?: {
    minCharacters?: number;
    preferOcr?: boolean;
  }
) {
  const minCharacters = options?.minCharacters ?? 25;
  const normalizedMimeType = normalizeDocumentMimeType(mimeType);
  const isPdf = normalizedMimeType === "application/pdf";
  const shouldUseOcrFirst = options?.preferOcr ?? false;

  if (isPdf && !shouldUseOcrFirst) {
    const extractedText = await extractPdfText(fileBuffer);
    if (extractedText.length >= minCharacters) {
      return truncateText(extractedText);
    }
  }

  if (isGeminiConfigured()) {
    const ocrPrompt = `Extract all readable text from this business document.

Return plain text only.
- Preserve clause numbers, headings, payment terms, dates, totals, and party names.
- Preserve table rows as line-based text where possible.
- Do not summarize, explain, or format as markdown.
- If some text is unreadable, skip only the unreadable fragments and continue extracting the rest.`;

    const ocrText = await generateTextWithFile(
      ocrPrompt,
      { data: fileBuffer.toString("base64"), mimeType: normalizedMimeType },
      LONG_CONTEXT_MODEL
    );

    if (ocrText.trim().length >= minCharacters) {
      return truncateText(ocrText);
    }
  }

  if (isPdf && shouldUseOcrFirst) {
    const extractedText = await extractPdfText(fileBuffer);
    if (extractedText.length >= minCharacters) {
      return truncateText(extractedText);
    }
  }

  throw new Error(
    isGeminiConfigured()
      ? "Could not extract enough readable text from this document."
      : "Could not extract enough readable text from this document and GEMINI_API_KEY is not set for OCR fallback."
  );
}

export async function generatePreferredJSON<T>(
  prompt: string,
  options?: {
    geminiModel?: string;
  }
) {
  if (isGroqConfigured()) {
    return groqJSON<T>(prompt);
  }

  return generateJSON<T>(prompt, options?.geminiModel);
}
