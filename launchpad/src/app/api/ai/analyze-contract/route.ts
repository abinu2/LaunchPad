/**
 * POST /api/ai/analyze-contract
 *
 * Two-phase streaming response via OpenRouter (Gemini 2.0 Flash):
 *   Phase 1 — OpenRouter SSE tokens are forwarded to the client as they arrive.
 *              The client sees real progress instead of a frozen loading bar.
 *   Phase 2 — Once the full JSON is assembled, we persist the Contract to the DB
 *              and flush the final serialized record as a sentinel.
 *
 * PDFs   → pdf-parse text extraction → text stream   (~4–7 s)
 * Images → Gemini vision one-shot + stream            (~3–5 s)
 */
import { NextRequest } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  extractDocumentText,
  isSupportedDocumentMimeType,
  isImageMimeType,
  normalizeDocumentMimeType,
} from "@/lib/document-ai";
import { fetchWithRetry } from "@/lib/fetch-file";
import { serializeContract } from "@/lib/serializers";
import {
  LAUNCHPAD_SYSTEM_PROMPT,
  getAIHeaders,
  getAIApiUrl,
  getGroqModel,
  getGroqVisionModel,
  cleanJSON,
  isGroqConfigured,
} from "@/lib/groq";
import type { Contract, ContractAnalysis, ContractObligation } from "@/types/contract";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_CONTRACT_CHARS = 40_000;

const CONTRACT_SCHEMA = `{
  "summary":"2-3 sentence plain English summary",
  "contractType":"service_agreement|vendor_agreement|lease|partnership|employment|financing|other",
  "counterpartyName":"string",
  "effectiveDate":"YYYY-MM-DD or null",
  "expirationDate":"YYYY-MM-DD or null",
  "autoRenews":boolean,
  "autoRenewalDate":"YYYY-MM-DD or null",
  "autoRenewalNoticePeriod":number|null,
  "terminationNoticePeriod":number|null,
  "totalValue":number|null,
  "monthlyValue":number|null,
  "healthScore":0-100,
  "riskLevel":"low|medium|high|critical",
  "clauses":[{"clauseTitle":"","plainEnglish":"","riskLevel":"safe|caution|danger","issue":null,"recommendation":null}],
  "missingProtections":["string"],
  "recommendations":["string"],
  "estimatedAnnualCost":number|null,
  "obligations":[{"description":"","party":"business|counterparty","triggerType":"date|event|recurring","dueDate":null,"recurringFrequency":null,"status":"pending"}]
}`;

function buildTextPrompt(contractText: string, bizName: string) {
  return `You are a business attorney. Analyze this contract for "${bizName}". Be concise.

CONTRACT TEXT:
${contractText.slice(0, MAX_CONTRACT_CHARS)}${contractText.length > MAX_CONTRACT_CHARS ? "\n\n[Truncated]" : ""}

Return ONLY valid JSON matching this schema (no markdown):
${CONTRACT_SCHEMA}

Score: 90-100=clean, 70-89=minor, 50-69=significant, <50=major. Flag personal guarantees, non-competes, auto-renewals, one-sided indemnification.`;
}

function buildVisionPrompt(bizName: string) {
  return `You are a business attorney. Read this contract image and analyze it for "${bizName}".

Return ONLY valid JSON (no markdown):
${CONTRACT_SCHEMA}

Score: 90-100=clean, 70-89=minor, 50-69=significant, <50=major.`;
}

type ContractAIResult = {
  summary: string;
  contractType: Contract["contractType"];
  counterpartyName: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  autoRenews: boolean;
  autoRenewalDate: string | null;
  autoRenewalNoticePeriod: number | null;
  terminationNoticePeriod: number | null;
  totalValue: number | null;
  monthlyValue: number | null;
  healthScore: number;
  riskLevel: ContractAnalysis["riskLevel"];
  clauses: ContractAnalysis["clauses"];
  missingProtections: string[];
  recommendations: string[];
  estimatedAnnualCost: number | null;
  obligations: Omit<ContractObligation, "id" | "lastChecked">[];
};

/**
 * Read an OpenRouter SSE stream and collect all token deltas.
 * Simultaneously forwards each delta to the client via `onDelta`.
 */
async function readSSEStream(
  responseBody: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => Promise<void>
): Promise<string> {
  const reader  = responseBody.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === "[DONE]") return fullText;

      try {
        const parsed = JSON.parse(jsonStr) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          fullText += delta;
          await onDelta(delta);
        }
      } catch {
        // Malformed SSE line — skip
      }
    }
  }

  return fullText;
}

export async function POST(req: NextRequest) {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const send  = async (data: unknown) =>
    writer.write(enc.encode(JSON.stringify(data))).catch(() => {});
  const close = () => writer.close().catch(() => {});

  const run = async () => {
    try {
      const body = await req.json() as {
        fileBase64?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileMimeType?: string;
        businessId?: string;
        uploadedFileId?: string;
      };

      const { fileBase64, fileUrl, fileName, fileType, businessId, uploadedFileId } = body;
      const fileMimeType = body.fileMimeType ?? "";

      if (!businessId || (!fileBase64 && !fileUrl)) {
        await send({ error: "businessId and either fileBase64 or fileUrl are required" });
        return close();
      }

      const normalizedMime = normalizeDocumentMimeType(
        fileMimeType || (fileType === "pdf" ? "application/pdf" : "")
      );

      if (!isSupportedDocumentMimeType(normalizedMime)) {
        await send({ error: "Unsupported file type. Upload a PDF or image (JPG, PNG, WEBP)." });
        return close();
      }

      if (!isGroqConfigured()) {
        await send({ error: "AI API key is not configured (set OPENROUTER_API_KEY or GROQ_API_KEY)" });
        return close();
      }

      const [{ business }, fileBuffer] = await Promise.all([
        requireBusinessAccess(businessId),
        fileBase64
          ? Promise.resolve(Buffer.from(fileBase64, "base64"))
          : fetchWithRetry(fileUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
      ]);

      const bizName = business.businessName ?? "the business owner";
      const headers = getAIHeaders();
      const apiUrl  = getAIApiUrl();

      let fullText = "";

      const onDelta = async (delta: string) => {
        await writer.write(enc.encode(delta)).catch(() => {});
      };

      // ── Stream AI tokens to the client ────────────────────────────────────
      if (isImageMimeType(normalizedMime)) {
        // Vision: Gemini handles the image natively
        const base64 = fileBuffer.toString("base64");
        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: getGroqVisionModel(),
            stream: true,
            temperature: 0.1,
            max_tokens: 4096,
            messages: [
              {
                role: "system",
                content:
                  LAUNCHPAD_SYSTEM_PROMPT +
                  "\n\nYou are a precise JSON API. Respond with valid JSON only — no markdown, no explanation.",
              },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${normalizedMime};base64,${base64}` } },
                  { type: "text", text: "IMPORTANT: Respond with valid JSON only. No markdown.\n\n" + buildVisionPrompt(bizName) },
                ],
              },
            ],
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text();
          throw new Error(`Vision API error ${res.status}: ${errText.slice(0, 200)}`);
        }

        fullText = await readSSEStream(res.body, onDelta);
      } else {
        // Text: extract document text, then stream
        const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
          minCharacters: 50,
          preferOcr: false,
        });

        const res = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: getGroqModel(),
            stream: true,
            temperature: 0.1,
            max_tokens: 4096,
            // NOTE: Do NOT set response_format: json_object with stream:true —
            // some providers buffer the entire response before emitting tokens.
            messages: [
              {
                role: "system",
                content:
                  "You are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.",
              },
              { role: "user", content: buildTextPrompt(contractText, bizName) },
            ],
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text();
          throw new Error(`Text stream API error ${res.status}: ${errText.slice(0, 200)}`);
        }

        fullText = await readSSEStream(res.body, onDelta);
      }

      // ── Parse assembled JSON ───────────────────────────────────────────────
      let ai: ContractAIResult;
      try {
        ai = JSON.parse(cleanJSON(fullText)) as ContractAIResult;
      } catch {
        const match = fullText.match(/\{[\s\S]*\}/);
        if (match) {
          ai = JSON.parse(match[0]) as ContractAIResult;
        } else {
          throw new Error("AI returned invalid JSON — please try again");
        }
      }

      // ── Persist to DB ──────────────────────────────────────────────────────
      const now = new Date();
      let status: Contract["status"] = "active";
      if (ai.expirationDate) {
        const days = Math.ceil(
          (new Date(ai.expirationDate).getTime() - now.getTime()) / 86_400_000
        );
        if (days < 0) status = "expired";
        else if (days <= 30) status = "expiring_soon";
      }

      const obligations: ContractObligation[] = (ai.obligations ?? []).map((o, i) => ({
        ...o,
        clauseRef: "",
        triggerDescription: "",
        monitoredField: null,
        monitoredThreshold: null,
        notes: null,
        id: `obl_${Date.now()}_${i}`,
        lastChecked: now.toISOString(),
      }));

      const analysisPayload = {
        summary: ai.summary ?? "",
        riskLevel: ai.riskLevel ?? "medium",
        clauses: ai.clauses ?? [],
        missingProtections: ai.missingProtections ?? [],
        conflicts: [],
        recommendations: ai.recommendations ?? [],
        estimatedAnnualCost: ai.estimatedAnnualCost ?? null,
        counterProposalDraft: null,
        playbookDeviations: [],
      };

      const contract = await prisma.contract.create({
        data: {
          businessId,
          fileName: fileName ?? "contract",
          fileUrl: fileUrl ?? "",
          fileType: fileType ?? "pdf",
          contractType: ai.contractType ?? "other",
          counterpartyName: ai.counterpartyName ?? "Unknown",
          effectiveDate: ai.effectiveDate ?? null,
          expirationDate: ai.expirationDate ?? null,
          autoRenews: ai.autoRenews ?? false,
          autoRenewalDate: ai.autoRenewalDate ?? null,
          autoRenewalNoticePeriod: ai.autoRenewalNoticePeriod ?? null,
          terminationNoticePeriod: ai.terminationNoticePeriod ?? null,
          totalValue: ai.totalValue ?? null,
          monthlyValue: ai.monthlyValue ?? null,
          healthScore: ai.healthScore ?? 75,
          status,
          analysis: JSON.parse(JSON.stringify(analysisPayload)),
          obligations: JSON.parse(JSON.stringify(obligations)),
        },
      });

      if (uploadedFileId) {
        // UploadedFile model not yet in schema — log for future linkage
        console.log("uploadedFileId for future linkage:", uploadedFileId);
      }

      // ── Send final sentinel ────────────────────────────────────────────────
      const serialized = serializeContract(contract);
      await writer
        .write(enc.encode("\n__CONTRACT__" + JSON.stringify(serialized)))
        .catch(() => {});
    } catch (err) {
      console.error("analyze-contract error:", err);
      const message = err instanceof Error ? err.message : "Contract analysis failed";
      await writer
        .write(enc.encode("\n__ERROR__" + JSON.stringify({ error: message })))
        .catch(() => {});
    } finally {
      close();
    }
  };

  void run();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
