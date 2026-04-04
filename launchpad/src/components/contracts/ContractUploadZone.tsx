"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { AILoadingScreen, ContractScanLoader } from "@/components/ui/LoadingScreen";
import { DOCUMENT_UPLOAD_MAX_BYTES } from "@/lib/blob-upload";
import { uploadDocumentFromBrowser } from "@/lib/upload-document";

interface Props {
  businessId: string;
  onComplete: (contractId: string) => void;
  onCancel: () => void;
}

type Stage = "idle" | "uploading" | "analyzing" | "error";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

// Parse the streaming response from analyze-contract.
// The server streams raw Groq tokens, then appends a sentinel line:
//   \n__CONTRACT__{...serialized contract JSON}
//   \n__ERROR__{...error JSON}
// onChunk fires on every received chunk so the caller can update progress.
async function readAnalysisStream(
  res: Response,
  onChunk: (totalChars: number) => void
): Promise<{ contract?: Record<string, unknown>; error?: string }> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let totalChars = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      totalChars += chunk.length;
      onChunk(totalChars); // fire immediately on each chunk
    }
  } finally {
    reader.releaseLock();
  }

  // Extract sentinel from the end of the buffer
  const contractIdx = buffer.lastIndexOf("\n__CONTRACT__");
  if (contractIdx !== -1) {
    try {
      return { contract: JSON.parse(buffer.slice(contractIdx + "\n__CONTRACT__".length)) };
    } catch { /* fall through */ }
  }

  const errorIdx = buffer.lastIndexOf("\n__ERROR__");
  if (errorIdx !== -1) {
    try {
      const parsed = JSON.parse(buffer.slice(errorIdx + "\n__ERROR__".length)) as { error?: string };
      return { error: parsed.error ?? "Analysis failed" };
    } catch { /* fall through */ }
  }

  // Fallback: try to parse the whole buffer as JSON (error response)
  try {
    const parsed = JSON.parse(buffer.trim()) as Record<string, unknown>;
    if (parsed.error) return { error: String(parsed.error) };
    if (parsed.id) return { contract: parsed };
  } catch { /* ignore */ }

  throw new Error("Analysis response was incomplete — please try again");
}

export function ContractUploadZone({ businessId, onComplete, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Uploading...");
  const smoothTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetProgressRef = useRef(0);

  // Smooth progress interpolation — moves toward targetProgressRef at a
  // controlled rate so the bar never jumps or stalls visibly.
  useEffect(() => {
    smoothTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const target = targetProgressRef.current;
        if (prev >= target) return prev;
        // Move 8% of the gap per tick (fast early, slows near target)
        const step = Math.max(0.5, (target - prev) * 0.08);
        return Math.min(target, prev + step);
      });
    }, 120);
    return () => {
      if (smoothTimerRef.current) clearInterval(smoothTimerRef.current);
    };
  }, []);

  const setTarget = (pct: number) => {
    targetProgressRef.current = pct;
  };

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setStage("uploading");
      setStatusLabel("Uploading document...");
      setTarget(5);

      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const fileType = isPdf ? "pdf" : isImage ? "image" : "pdf";

      try {
        // ── Step 1: Upload to Vercel Blob (0–40%) ─────────────────────────
        setTarget(10);
        const uploadedBlob = await uploadDocumentFromBrowser({
          file,
          businessId,
          folder: "contracts",
          onProgress: (pct) => {
            // Upload maps to 10–38%
            setTarget(10 + Math.round(pct * 0.28));
          },
        });
        setTarget(40);

        // ── Step 2: Register the file in UploadedFile table ───────────────
        let uploadedFileId: string | undefined;
        try {
          const regRes = await fetch(`/api/data/businesses/${businessId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blobUrl: uploadedBlob.url,
              blobPath: uploadedBlob.pathname ?? "",
              fileName: file.name,
              fileSize: file.size,
              mimeType: uploadedBlob.contentType ?? file.type,
              folder: "contracts",
            }),
          });
          if (regRes.ok) {
            const reg = await regRes.json() as { id?: string };
            uploadedFileId = reg.id;
          }
        } catch {
          // Non-blocking — file registration failure shouldn't stop analysis
        }

        // ── Step 3: Stream analysis (40–95%) ──────────────────────────────
        setStage("analyzing");
        setStatusLabel("Reading contract clauses...");
        setTarget(45);

        const analyzeRes = await fetch("/api/ai/analyze-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType,
            fileMimeType: uploadedBlob.contentType ?? file.type,
            fileUrl: uploadedBlob.url,
            businessId,
            uploadedFileId,
          }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json().catch(() => ({ error: `Analysis failed (HTTP ${analyzeRes.status})` }));
          throw new Error((err as { error?: string }).error ?? "Analysis failed");
        }

        // Read the stream — each chunk fires onChunk immediately, advancing progress
        let lastChars = 0;
        let currentTarget = 45;
        const result = await readAnalysisStream(analyzeRes, (totalChars) => {
          const delta = totalChars - lastChars;
          lastChars = totalChars;
          if (delta > 0) {
            // First ~2KB of tokens: 45→70% (fast visible movement)
            // Next ~8KB: 70→88% (slowing down)
            // Beyond: hold at 88% until sentinel arrives
            if (currentTarget < 70) {
              currentTarget = Math.min(70, currentTarget + delta * 0.12);
            } else if (currentTarget < 88) {
              currentTarget = Math.min(88, currentTarget + delta * 0.02);
            }
            setTarget(currentTarget);
          }
          if (currentTarget > 60 && currentTarget < 75) setStatusLabel("Scoring risk and obligations...");
          else if (currentTarget >= 75) setStatusLabel("Finalizing analysis...");
        });

        if (result.error) throw new Error(result.error);
        if (!result.contract?.id) throw new Error("Analysis returned no contract ID");

        setTarget(100);
        // Small delay so user sees 100% before navigating
        await new Promise((r) => setTimeout(r, 400));
        onComplete(result.contract.id as string);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStage("error");
        setTarget(0);
      }
    },
    [businessId, onComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: DOCUMENT_UPLOAD_MAX_BYTES,
    onDropAccepted: ([file]) => processFile(file),
    onDropRejected: ([rejection]) => {
      setError(rejection.errors[0]?.message ?? "Invalid file");
    },
    disabled: stage === "uploading" || stage === "analyzing",
  });

  const isProcessing = stage === "uploading" || stage === "analyzing";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Upload contract for analysis</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isProcessing ? (
        stage === "analyzing" ? (
          <ContractScanLoader progress={progress} stage={statusLabel} />
        ) : (
          <AILoadingScreen
            title="Uploading contract"
            steps={["Securing file transfer", "Uploading document", "Preparing for analysis"]}
            progress={progress}
            variant="inline"
          />
        )
      ) : (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium mb-1">
              {isDragActive ? "Drop it here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-slate-400 text-sm">PDF or image (JPG, PNG, WEBP) · Max 100 MB</p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start justify-between">
              <span>{error}</span>
              <button
                onClick={() => { setError(null); setStage("idle"); setTarget(0); }}
                className="text-red-500 hover:text-red-700 text-xs font-medium ml-3 flex-shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            AI reads every clause and flags risks, obligations, and renewal dates.
          </p>
        </>
      )}
    </div>
  );
}
