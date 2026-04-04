"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  businessId: string;
  onComplete: (contractId: string) => void;
  onCancel: () => void;
}

type Stage = "idle" | "uploading" | "analyzing" | "error";

// DOCX is excluded — Gemini's inline data API does not support it.
// Users should convert DOCX to PDF before uploading.
const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const STAGE_MESSAGES: Record<Stage, string> = {
  idle: "",
  uploading: "Uploading document...",
  analyzing: "Reading contract... Analyzing clauses... Checking for conflicts...",
  error: "",
};

export function ContractUploadZone({ businessId, onComplete, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setStage("uploading");
      setProgress(10);

      try {
        // Step 1: Upload the file to document storage
        const formData = new FormData();
        formData.append("file", file);
        formData.append("businessId", businessId);
        formData.append("folder", "contracts");

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error ?? "Upload failed");
        }

        const { url, name, mimeType: fileMimeType } = await uploadRes.json();
        setProgress(40);
        setStage("analyzing");

        // Step 2: Analyze with Gemini
        const fileType = file.type.includes("pdf")
          ? "pdf"
          : file.type.includes("word")
          ? "docx"
          : "image";

        const analyzeRes = await fetch("/api/ai/analyze-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: url,
            fileName: name,
            fileType,
            fileMimeType: fileMimeType ?? file.type,
            businessId,
          }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error ?? "Analysis failed");
        }

        const contract = await analyzeRes.json();
        setProgress(100);
        onComplete(contract.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStage("error");
      }
    },
    [businessId, onComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDropAccepted: ([file]) => processFile(file),
    onDropRejected: ([rejection]) => {
      const msg = rejection.errors[0]?.message ?? "Invalid file";
      setError(msg);
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
        <div className="py-10 text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-700 font-medium">{STAGE_MESSAGES[stage]}</p>
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {stage === "analyzing" ? "This takes 20–40 seconds for a thorough analysis." : ""}
          </p>
        </div>
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
            <p className="text-slate-400 text-sm">PDF or image (JPG, PNG, WEBP) · Max 20 MB</p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            Gemini reads the full contract and produces a clause-by-clause analysis, risk score, and counter-proposal draft.
          </p>
        </>
      )}
    </div>
  );
}
