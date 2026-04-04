/**
 * Groq client — server-side only.
 * Ultra-fast inference via llama-3.3-70b-versatile (text) and llama-3.2 vision models.
 * Import only in API routes (src/app/api/**).
 */
import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
/** Vision model for OCR + analysis of images in one call */
export const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_JSON_MAX_TOKENS = Number(process.env.GROQ_JSON_MAX_TOKENS ?? "4096");
const GROQ_VISION_JSON_MAX_TOKENS = Number(process.env.GROQ_VISION_JSON_MAX_TOKENS ?? "3072");
const GROQ_VISION_TEXT_MAX_TOKENS = Number(process.env.GROQ_VISION_TEXT_MAX_TOKENS ?? "4096");
const GROQ_TEXT_MAX_TOKENS = Number(process.env.GROQ_TEXT_MAX_TOKENS ?? "2048");

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
 * Generate a JSON response from a text-only prompt.
 * Uses llama-3.3-70b-versatile with json_object mode.
 * Keep max_tokens conservative to reduce latency on Vercel hobby plan.
 */
export async function groqJSON<T>(prompt: string): Promise<T> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: GROQ_JSON_MAX_TOKENS,
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
 * Generate a JSON response from a prompt + an image.
 * Uses a Groq vision model to do OCR and structured analysis in a single API call.
 * The prompt must ask for JSON output explicitly.
 */
export async function groqVisionJSON<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<T> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: GROQ_VISION_MODEL,
    stream: false,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          {
            type: "text",
            text:
              "IMPORTANT: Respond with a valid JSON object only. No markdown fences, no explanation.\n\n" +
              prompt,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: GROQ_VISION_JSON_MAX_TOKENS,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const cleaned = cleanJSON(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract JSON substring if model added surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through
      }
    }
    throw new Error(`Groq vision returned invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Generate plain text from Groq (used for OCR from images when you only need raw text).
 */
export async function groqVisionText(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: GROQ_VISION_MODEL,
    stream: false,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: GROQ_VISION_TEXT_MAX_TOKENS,
  });

  return completion.choices[0]?.message?.content ?? "";
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
    max_tokens: GROQ_TEXT_MAX_TOKENS,
  });
  return completion.choices[0]?.message?.content ?? "";
}
