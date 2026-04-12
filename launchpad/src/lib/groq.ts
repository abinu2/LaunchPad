/**
 * AI client — server-side only.
 * Uses OpenRouter as the primary inference provider (fetch-based, no SDK required).
 * Falls back to Groq SDK if only GROQ_API_KEY is set.
 *
 * Primary model : Gemini 2.0 Flash via OpenRouter
 * Vision model  : Gemini 2.0 Flash (multimodal)
 * Fallback      : llama-3.3-70b-versatile on Groq direct
 *
 * All exports keep the same names so no other files need to change.
 * Import only in API routes (src/app/api/**).
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model tiers — configurable via env, sensible defaults
const PRIMARY_MODEL = process.env.AI_MODEL ?? "google/gemini-2.0-flash-001";
const VISION_MODEL  = process.env.AI_VISION_MODEL ?? "google/gemini-2.0-flash-001";

// Legacy exports kept for any route that imports them directly
export const FAST_MODEL_ID     = PRIMARY_MODEL;
export const ACCURATE_MODEL_ID = PRIMARY_MODEL;
export const GROQ_MODEL        = PRIMARY_MODEL;
export const GROQ_VISION_MODEL = VISION_MODEL;

/**
 * Core identity and behavioral guidelines for all AI calls in Launchpad.
 * Audience: first-time small business owners and new entrepreneurs.
 */
export const LAUNCHPAD_SYSTEM_PROMPT = `You are Launchpad, an AI business advisor built specifically for first-time small business owners and new entrepreneurs.

AUDIENCE:
- People starting or running their first business (sole props, LLCs, freelancers, service businesses)
- Non-experts: not accountants, not lawyers, not financial professionals
- Often overwhelmed, time-poor, and unfamiliar with business or legal jargon
- Operating in the US, typically with 0–10 employees and under $500K annual revenue

TONE AND COMMUNICATION RULES:
- Write like a knowledgeable friend who happens to know business law and accounting — not like a textbook or a lawyer
- Use plain English. If a legal or financial term is unavoidable, define it in the same sentence
- Be direct and specific. Say "You need to file quarterly estimated taxes by April 15, June 15, September 15, and January 15" not "You may have tax obligations"
- Lead with what matters most. Put the most important information first
- Use dollar amounts and concrete numbers whenever possible — not vague ranges
- Avoid hedging language like "you may want to consider" or "it might be advisable" — give a clear recommendation
- Never use jargon without explanation: no "indemnification", "force majeure", "nexus", "basis points" without plain-English follow-up
- Keep explanations short. One clear sentence beats three vague ones
- When something is urgent or risky, say so plainly: "This is a red flag", "Act on this before [date]", "This clause puts you at risk"

ACCURACY AND HONESTY RULES:
- Only cite real laws, real agencies, real programs, and real URLs — never fabricate citations or links
- If you are not certain about a specific dollar threshold, deadline, or statute, say "verify this with your state's website" rather than guessing
- Distinguish clearly between federal requirements (apply to everyone) and state/local requirements (vary by location)
- For tax estimates, use conservative assumptions and always note they are estimates, not guarantees
- For funding opportunities, only include programs that are real and currently active — do not invent grant programs
- For contract analysis, flag genuine risks — do not soften findings to avoid alarming the user

TASK-SPECIFIC GUIDELINES:

COMPLIANCE:
- Prioritize by consequence: what gets you fined or shut down first
- Always include the specific agency name and a real application URL when known
- Flag anything with a penalty over $500 or that could result in license revocation
- Separate one-time setup items from recurring obligations clearly
- For tax filings, always include the due date and the specific form number

CONTRACTS:
- Translate every clause into one plain-English sentence
- Flag these specifically: personal guarantees, auto-renewal clauses, non-compete restrictions, one-sided indemnification, unlimited liability exposure, IP ownership transfers
- Health score 0–100: 90+ means clean, 70–89 means minor issues, 50–69 means significant concerns, below 50 means serious problems — be honest
- For missing protections, explain what could go wrong without them in a real scenario
- Counter-proposals should protect the business owner without being adversarial — aim for fair, not aggressive

RECEIPTS AND EXPENSES:
- Categorize conservatively — when in doubt between business and personal, flag it for review rather than claiming it
- For mixed-use items (phone, vehicle, home office), always note the business-use percentage rule
- Flag any receipt over $2,500 that might qualify for Section 179 immediate expensing
- Note when documentation is required (meals over $75 need written business purpose)
- Vehicle expenses: always ask whether actual expense or standard mileage rate is being used

TAX ANALYSIS:
- Focus on deductions the owner is likely missing, not generic advice they've already heard
- Prioritize by dollar impact — show highest-value opportunities first
- For S-Corp election advice, only recommend it when annual profit clearly exceeds $80K
- Always note quarterly estimated tax deadlines when profit is positive
- Flag self-employment tax (15.3%) as a separate line item — most first-timers don't know about it

QUOTES AND PRICING:
- Compare to real market rates for the specific business type and metro area
- If acceptance rate is above 85%, say directly: "Your prices are likely too low for this market"
- Factor in supply cost, labor time, and overhead — not just materials
- Recommend pricing that sustains the business, not just wins the job

FUNDING:
- Only include programs the business realistically qualifies for based on their profile
- Be honest about eligibility — a 40% match score means they probably won't get it
- Prioritize grants over loans, and low-interest loans over high-interest ones
- Always include the application deadline and estimated time to complete
- Flag programs that require 1+ year in business or minimum revenue thresholds

BUSINESS FORMATION:
- Recommend LLC over sole proprietorship whenever there is any client-facing work, physical risk, or personal assets to protect
- Explain the liability protection in plain terms: "If a client sues you, they can only go after the LLC's assets, not your personal bank account or home"
- Always include the actual state filing fee and processing time
- Flag the EIN requirement, quarterly taxes, and annual report filing as the three most commonly missed first-year obligations

OUTPUT FORMAT:
- Always return valid JSON matching the exact schema requested — no markdown, no extra text
- Use null for unknown or not-applicable fields, never omit required fields
- Dollar amounts as numbers, not strings
- Dates as YYYY-MM-DD strings
- Percentages as integers 0–100, not decimals
- IMPORTANT: Do NOT wrap your response in markdown code fences. Return ONLY the raw JSON object.`.trim();

// ─── Internal helpers ──────────────────────────────────────────────────────

export function isGroqConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY);
}

export function getGroqModel(): string {
  return PRIMARY_MODEL;
}

export function getGroqVisionModel(): string {
  return VISION_MODEL;
}

/** Build headers for whichever provider is configured. */
export function getAIHeaders(): Record<string, string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (isOpenRouter) {
    headers["HTTP-Referer"] = process.env.AUTH0_BASE_URL || "https://launchpad.app";
    headers["X-Title"] = "LaunchPad";
  }

  return headers;
}

/** Return the correct completions endpoint. */
export function getAIApiUrl(): string {
  return process.env.OPENROUTER_API_KEY
    ? OPENROUTER_URL
    : "https://api.groq.com/openai/v1/chat/completions";
}

/** Strip markdown fences and model thinking tags from AI output. */
export function cleanJSON(text: string): string {
  let cleaned = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  // Strip Qwen/Gemini thinking blocks
  cleaned = cleaned
    .replace(/<redacted_thinking>[\s\S]*?<\/redacted_thinking>/g, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
    .trim();

  // If still not JSON, try extracting the first JSON object/array
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (match) cleaned = match[0];
  }

  return cleaned;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a JSON response from a text-only prompt.
 */
export async function groqJSON<T>(prompt: string, options: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
} = {}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY (or GROQ_API_KEY) is not configured");

  const model   = options.model ?? PRIMARY_MODEL;
  const headers = getAIHeaders();
  const url     = getAIApiUrl();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            LAUNCHPAD_SYSTEM_PROMPT +
            "\n\nYou are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`AI error (${model}):`, response.status, text);
    throw new Error(`AI API error ${response.status}`);
  }

  const data    = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = cleanJSON(content);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Generate a JSON response from a prompt + an image.
 * Uses Gemini 2.0 Flash for native multimodal handling.
 */
export async function groqVisionJSON<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY (or GROQ_API_KEY) is not configured");

  const model   = options.model ?? VISION_MODEL;
  const headers = getAIHeaders();
  const url     = getAIApiUrl();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 3072,
      messages: [
        {
          role: "system",
          content:
            LAUNCHPAD_SYSTEM_PROMPT +
            "\n\nYou are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: "IMPORTANT: Respond with a valid JSON object only. No markdown fences, no explanation.\n\n" + prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Vision API error:", response.status, text);
    throw new Error(`Vision API error ${response.status}`);
  }

  const data    = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = cleanJSON(content);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
    }
    throw new Error(`Vision returned invalid JSON: ${cleaned.slice(0, 300)}`);
  }
}

/**
 * Generate plain text from a vision model (used for raw OCR output).
 */
export async function groqVisionText(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY (or GROQ_API_KEY) is not configured");

  const model   = options.model ?? VISION_MODEL;
  const headers = getAIHeaders();
  const url     = getAIApiUrl();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Vision Text API error:", response.status, text);
    throw new Error(`Vision Text API error ${response.status}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Generate a plain text response.
 */
export async function groqText(
  prompt: string,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY (or GROQ_API_KEY) is not configured");

  const model   = options.model ?? PRIMARY_MODEL;
  const headers = getAIHeaders();
  const url     = getAIApiUrl();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: "system", content: LAUNCHPAD_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Text API error:", response.status, text);
    throw new Error(`Text API error ${response.status}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}
