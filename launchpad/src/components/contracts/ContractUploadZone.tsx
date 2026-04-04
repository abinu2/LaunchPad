"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { AILoadingScreen, ContractScanLoader } from "@/components/ui/LoadingScreen";
import {
  DOCUMENT_UPLOAD_MAX_BYTES,
} from "@/lib/blob-upload";
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

export function ContractUploadZone({ businessId, onComplete, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate smooth progress during the "analyzing" stage since we can't
  // get real-time progress from a streaming fetch. This prevents the bar
  // from stalling and gives users confidence something is happening.
  useEffect(() => {
    if (stage === "analyzing") {
      analyzeTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          // Slow asymptotic curve — accelerates early, slows near 90
          return prev + (92 - prev) * 0.04;
        });
      }, 400);
    } else if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
    return () => {
      if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    };
  }, [stage]);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setStage("uploading");
      setProgress(5);

      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const fileType = isPdf ? "pdf" : isImage ? "image" : "pdf";

      try {
        // Step 1: Upload to Vercel Blob for storage
        // The file goes directly from the browser to Vercel Blob (no serverless
        // function body limit). The analyze route will download from the Blob URL
        // on the server side — this avoids Vercel's 4.5 MB request body limit
        // that was causing failures when sending fileBase64 inline.
        setProgress(12);
        const uploadedBlob = await uploadDocumentFromBrowser({
          file,
          businessId,
          folder: "contracts",
          onProgress: (pct) => {
            // Upload maps to 12–38% of total progress
            setProgress(Math.max(12, Math.min(38, 12 + Math.round(pct * 0.26))));
          },
        });
        setProgress(40);

        // Step 2: Analyze — the simulated progress effect takes over here
        setStage("analyzing");

        const analyzeRes = await fetch("/api/ai/analyze-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType,
            fileMimeType: uploadedBlob.contentType ?? file.type,
            fileUrl: uploadedBlob.url,
            businessId,
          }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.json().catch(() => ({ error: `Analysis failed (HTTP ${analyzeRes.status})` }));
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
    maxSize: DOCUMENT_UPLOAD_MAX_BYTES,
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
        stage === "analyzing" ? (
          <ContractScanLoader progress={progress} stage="AI is reading every clause..." />
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
            <p className="text-slate-400 text-sm">PDF or image (JPG, PNG, WEBP) - Max 100 MB</p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start justify-between">
              <span>{error}</span>
              <button
                onClick={() => { setError(null); setStage("idle"); setProgress(0); }}
                className="text-red-500 hover:text-red-700 text-xs font-medium ml-3 flex-shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            Contract analysis reads extracted text first and only uses OCR when the document needs help yielding readable text.
          </p>
        </>
      )}
    </div>
  );
}
