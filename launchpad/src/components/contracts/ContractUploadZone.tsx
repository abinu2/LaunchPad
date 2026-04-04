"use client";

import { useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { useDropzone } from "react-dropzone";
import { AILoadingScreen, ContractScanLoader } from "@/components/ui/LoadingScreen";
import {
  buildBusinessBlobPath,
  DOCUMENT_UPLOAD_MAX_BYTES,
} from "@/lib/blob-upload";

interface Props {
  businessId: string;
  onComplete: (contractId: string) => void;
  onCancel: () => void;
}

type Stage = "idle" | "uploading" | "analyzing" | "error";

// DOCX is excluded because the analysis pipeline is optimized for PDFs and images.
// Users should convert DOCX to PDF before uploading.
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

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setStage("uploading");
      setProgress(10);

      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const sendBase64 = isImage && file.size < 3 * 1024 * 1024;
      const fileType = isPdf ? "pdf" : isImage ? "image" : "pdf";

      try {
        const blobPath = buildBusinessBlobPath({
          businessId,
          folder: "contracts",
          fileName: file.name,
        });

        if (sendBase64) {
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const uploadedBlob = await upload(blobPath, file, {
            access: "public",
            contentType: file.type,
            handleUploadUrl: "/api/documents/client-upload",
            clientPayload: JSON.stringify({ businessId, folder: "contracts", originalFileName: file.name }),
            onUploadProgress: ({ percentage }) => {
              setProgress(Math.max(10, Math.min(35, Math.round(percentage * 0.35))));
            },
          });

          setProgress(40);
          setStage("analyzing");

          const analyzeRes = await fetch("/api/ai/analyze-contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64,
              fileUrl: uploadedBlob.url,
              fileName: file.name,
              fileType,
              fileMimeType: file.type,
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
        } else {
          const uploadedBlob = await upload(blobPath, file, {
            access: "public",
            contentType: file.type,
            handleUploadUrl: "/api/documents/client-upload",
            clientPayload: JSON.stringify({ businessId, folder: "contracts", originalFileName: file.name }),
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => {
              setProgress(Math.max(10, Math.min(35, Math.round(percentage * 0.35))));
            },
          });
          setProgress(40);
          setStage("analyzing");

          const analyzeRes = await fetch("/api/ai/analyze-contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileUrl: uploadedBlob.url,
              fileName: file.name,
              fileType,
              fileMimeType: uploadedBlob.contentType ?? file.type,
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
        }
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
            steps={["Securing file transfer", "Uploading to Vercel Blob", "Preparing for analysis"]}
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
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            Groq handles the contract review after text extraction, with OCR fallback only when a document needs help yielding readable text.
          </p>
        </>
      )}
    </div>
  );
}
