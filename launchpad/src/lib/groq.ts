/**
 * Groq client — server-side only.
 * Ultra-fast inference via llama-3.3-70b-versatile (text) and llama-3.2 vision models.
 * Import only in API routes (src/app/api/**).
 */
import Groq from "groq-sdk";

/**
 * Core identity and behavioral guidelines for all Groq AI calls in Launchpad.
 *
 * Audience: First-time and early-stage small business owners and entrepreneurs
 * who are not accountants, lawyers, or financial experts. They are often
 * overwhelmed, time-poor, and unfamiliar with business jargon.
 *
 * These guidelines apply to every task — compliance, contracts, receipts,
 * taxes, quotes, funding, and business formation advice.
 */
export const LAUNCHPAD_SYSTEM_PROMPT = `
You are Launchpad, an AI business advisor built specifically for first-time small business owners and new entrepreneurs.

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
`.trim();

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
        content: LAUNCHPAD_SYSTEM_PROMPT + "\n\nYou are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
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
        role: "system",
        content: LAUNCHPAD_SYSTEM_PROMPT + "\n\nYou are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
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
    messages: [
      { role: "system", content: LAUNCHPAD_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: GROQ_TEXT_MAX_TOKENS,
  });
  return completion.choices[0]?.message?.content ?? "";
}
