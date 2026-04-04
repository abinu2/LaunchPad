/**
 * Gemini API client - server-side only.
 * ONLY import this file in API routes (src/app/api/**).
 */
import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const LONG_CONTEXT_MODEL = process.env.GEMINI_LONG_CONTEXT_MODEL ?? DEFAULT_MODEL;

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return geminiClient;
}

function cleanModelText(text: string | undefined) {
  return (text ?? "")
    .replace(/^```(?:json|html)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
}

function requireModelText(text: string | undefined, modelName: string) {
  const cleaned = cleanModelText(text);
  if (!cleaned) {
    throw new Error(`Gemini returned an empty response for model ${modelName}`);
  }
  return cleaned;
}

export async function generateText(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: modelName,
    contents: prompt,
  });

  return requireModelText(response.text, modelName);
}

export async function generateJSON<T>(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<T> {
  const response = await getGeminiClient().models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const cleaned = requireModelText(response.text, modelName);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * Generate a structured JSON response from a prompt + an attached file (PDF or image).
 * fileData.data must be a base64-encoded string of the file content.
 * fileData.mimeType must be a Gemini-supported MIME type (application/pdf, image/jpeg, etc.).
 */
export async function generateJSONWithFile<T>(
  prompt: string,
  fileData: { data: string; mimeType: string },
  modelName: string = LONG_CONTEXT_MODEL
): Promise<T> {
  const response = await getGeminiClient().models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: fileData },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const cleaned = requireModelText(response.text, modelName);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
