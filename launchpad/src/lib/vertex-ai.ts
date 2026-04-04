/**
 * Vertex AI client — server-side only.
 * ONLY import this file in API routes (src/app/api/**).
 */
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
});

export const DEFAULT_MODEL = "gemini-2.0-flash-001";
export const LONG_CONTEXT_MODEL = "gemini-1.5-pro"; // for contract analysis

export function getGeminiModel(modelName: string = DEFAULT_MODEL) {
  return vertexAI.getGenerativeModel({ model: modelName });
}

/** Helper: send a prompt and return parsed JSON, throwing on invalid JSON */
export async function generateJSON<T>(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<T> {
  const model = getGeminiModel(modelName);
  const result = await model.generateContent(prompt);
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
