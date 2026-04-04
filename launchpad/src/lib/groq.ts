/**
 * Groq client — server-side only.
 * Ultra-fast inference via llama-3.3-70b-versatile.
 * Import only in API routes (src/app/api/**).
 */
import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

function getGroqClient(): Groq {
  if (!isGroqConfigured()) {
    throw new Error("GROQ_API_KEY is not set");
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function cleanJSON(text: string): string {
  return text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
}

/**
 * Generate a JSON response from a text prompt using Groq.
 * Groq is text-only — use this after extracting text from PDFs.
 */
export async function groqJSON<T>(prompt: string): Promise<T> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 8192,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const cleaned = cleanJSON(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Groq returned invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Generate a plain text response from Groq.
 */
export async function groqText(prompt: string): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 4096,
  });
  return completion.choices[0]?.message?.content ?? "";
}
