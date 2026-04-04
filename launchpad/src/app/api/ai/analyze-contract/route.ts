/**
 * POST /api/ai/analyze-contract
 *
 * Two-phase streaming response:
 *   Phase 1 — Groq streams JSON tokens to the client as they arrive.
 *              The client sees real progress instead of a frozen bar.
 *   Phase 2 — Once the full JSON is assembled, we write the Contract
 *              record to the DB and flush the final serialized contract.
 *
 * This keeps the Vercel Hobby connection alive well past 10 s and gives
 * the user visible forward motion throughout the analysis.
 *
 * PDFs  → pdf-parse + Groq text stream  (~4-7 s)
 * Images → Groq vision one-shot + stream (~3-5 s)
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
import type { Contract, ContractAnalysis, ContractObligation } from "@/types/contract";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_CONTRACT_CHARS = 40_000;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

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

function buildPrompt(contractText: string, bizName: string) {
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

function cleanJSON(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
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

export async function POST(req: NextRequest) {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();

  const send = (data: unknown) => writer.write(enc.encode(JSON.stringify(data)));
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

      if (!process.env.GROQ_API_KEY) {
        await send({ error: "GROQ_API_KEY is not configured" });
        return close();
      }

      // Mark uploaded file as processing
      if (uploadedFileId) {
        await prisma.uploadedFile.update({
          where: { id: uploadedFileId },
          data: { analysisStatus: "processing" },
        }).catch(() => {});
      }

      const [{ business }, fileBuffer] = await Promise.all([
        requireBusinessAccess(businessId),
        fileBase64
          ? Promise.resolve(Buffer.from(fileBase64, "base64"))
          : fetchWithRetry(fileUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
      ]);

      const bizName = business.businessName ?? "the business owner";
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      let fullText = "";

      // ── Stream Groq tokens to the client ──────────────────────────────────
      if (isImageMimeType(normalizedMime)) {
        // Vision: one-shot with streaming
        const base64 = fileBuffer.toString("base64");
        const visionStream = await groq.chat.completions.create({
          model: GROQ_VISION_MODEL,
          stream: true,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${normalizedMime};base64,${base64}` } },
              { type: "text", text: "IMPORTANT: Respond with valid JSON only. No markdown.\n\n" + buildVisionPrompt(bizName) },
            ],
          }],
          temperature: 0.1,
          max_tokens: 4096,
        });

        for await (const chunk of visionStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            // Send progress tokens so the client sees movement
            await writer.write(enc.encode(delta)).catch(() => {});
          }
        }
      } else {
        // Text: extract then stream
        const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
          minCharacters: 50,
          preferOcr: false,
        });

        const textStream = await groq.chat.completions.create({
          model: GROQ_MODEL,
          stream: true,
          messages: [
            {
              role: "system",
              content: "You are a precise JSON API. Always respond with valid JSON only. No markdown, no explanation.",
            },
            { role: "user", content: buildPrompt(contractText, bizName) },
          ],
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        });

        for await (const chunk of textStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            await writer.write(enc.encode(delta)).catch(() => {});
          }
        }
      }

      // ── Parse the assembled JSON ───────────────────────────────────────────
      let ai: ContractAIResult;
      try {
        ai = JSON.parse(cleanJSON(fullText)) as ContractAIResult;
      } catch {
        // Try to extract JSON substring if model added surrounding text
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
        const days = Math.ceil((new Date(ai.expirationDate).getTime() - now.getTime()) / 86400000);
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

      // Update uploaded file record to link it to the contract
      if (uploadedFileId) {
        await prisma.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            analysisStatus: "complete",
            linkedType: "contract",
            linkedId: contract.id,
          },
        }).catch(() => {});
      }

      // ── Send the final contract record as a sentinel ───────────────────────
      // The client reads the stream, buffers all tokens, then on stream-end
      // parses the last valid JSON object (the contract record).
      const serialized = serializeContract(contract);
      await writer.write(enc.encode("\n__CONTRACT__" + JSON.stringify(serialized))).catch(() => {});

    } catch (err) {
      console.error("analyze-contract error:", err);
      const message = err instanceof Error ? err.message : "Contract analysis failed";
      await writer.write(enc.encode("\n__ERROR__" + JSON.stringify({ error: message }))).catch(() => {});
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
