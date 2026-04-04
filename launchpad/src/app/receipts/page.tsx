"use client";

import { useCallback, useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useDropzone } from "react-dropzone";
import { useBusiness } from "@/context/BusinessContext";
import { getReceipts, addReceipt } from "@/services/business-graph";
import { Spinner } from "@/components/ui/Spinner";
import { SiteNav } from "@/components/ui/SiteNav";
import type { Receipt, ExpenseCategory } from "@/types/financial";
import {
  buildBusinessBlobPath,
  DOCUMENT_UPLOAD_MAX_BYTES,
} from "@/lib/blob-upload";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: "Supplies",
  vehicle_fuel: "Vehicle / Fuel",
  vehicle_maintenance: "Vehicle Maintenance",
  insurance: "Insurance",
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  equipment: "Equipment",
  professional_services: "Professional Services",
  meals_entertainment: "Meals & Entertainment",
  office_supplies: "Office Supplies",
  software: "Software",
  training: "Training",
  other: "Other",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  supplies: "bg-blue-100 text-blue-700",
  vehicle_fuel: "bg-orange-100 text-orange-700",
  vehicle_maintenance: "bg-orange-100 text-orange-700",
  insurance: "bg-purple-100 text-purple-700",
  rent: "bg-pink-100 text-pink-700",
  utilities: "bg-yellow-100 text-yellow-700",
  marketing: "bg-cyan-100 text-cyan-700",
  equipment: "bg-indigo-100 text-indigo-700",
  professional_services: "bg-slate-100 text-slate-700",
  meals_entertainment: "bg-green-100 text-green-700",
  office_supplies: "bg-blue-100 text-blue-700",
  software: "bg-violet-100 text-violet-700",
  training: "bg-teal-100 text-teal-700",
  other: "bg-slate-100 text-slate-500",
};

type ScanStage = "idle" | "uploading" | "analyzing" | "done" | "error";

function ReceiptUploader({ businessId, onSaved }: { businessId: string; onSaved: () => void }) {
  const [stage, setStage] = useState<ScanStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState<Partial<Receipt> | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setStage("uploading");
    setProgress(15);

    try {
      const blobPath = buildBusinessBlobPath({
        businessId,
        folder: "receipts",
        fileName: file.name,
      });
      const uploadedBlob = await upload(blobPath, file, {
        access: "public",
        contentType: file.type,
        handleUploadUrl: "/api/documents/client-upload",
        clientPayload: JSON.stringify({
          businessId,
          folder: "receipts",
          originalFileName: file.name,
        }),
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.max(15, Math.min(35, Math.round(percentage * 0.35))));
        },
      });
      setProgress(40);
      setStage("analyzing");

      // Step 2: Analyze with Gemini
      const analyzeRes = await fetch("/api/ai/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: uploadedBlob.url,
          fileMimeType: uploadedBlob.contentType ?? file.type,
          businessId,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error ?? "Analysis failed");
      }

      const data = await analyzeRes.json();
      setProgress(80);
      setScanned({ ...data, imageUrl: uploadedBlob.url });
      setStage("done");
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("error");
    }
  }, [businessId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: DOCUMENT_UPLOAD_MAX_BYTES,
    onDropAccepted: ([file]) => processFile(file),
    onDropRejected: ([r]) => setError(r.errors[0]?.message ?? "Invalid file"),
    disabled: stage === "uploading" || stage === "analyzing",
  });

  const handleSave = async () => {
    if (!scanned) return;
    await addReceipt(businessId, {
      businessId,
      imageUrl: scanned.imageUrl ?? "",
      vendor: scanned.vendor ?? "",
      amount: scanned.amount ?? 0,
      date: scanned.date ?? new Date().toISOString().slice(0, 10),
      lineItems: scanned.lineItems ?? [],
      category: (scanned.category as ExpenseCategory) ?? "other",
      taxClassification: scanned.taxClassification as Receipt["taxClassification"] ?? "expense",
      businessPercentage: scanned.businessPercentage ?? 100,
      deductibleAmount: scanned.deductibleAmount ?? 0,
      taxNotes: scanned.taxNotes ?? "",
      isReconciled: false,
      associatedMileage: scanned.associatedMileage ?? null,
      needsMoreInfo: scanned.needsMoreInfo ?? false,
      pendingQuestion: scanned.pendingQuestion ?? null,
    });
    setScanned(null);
    setStage("idle");
    setProgress(0);
    onSaved();
  };

  const reset = () => { setStage("idle"); setScanned(null); setError(null); setProgress(0); };

  if (stage === "uploading" || stage === "analyzing") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Spinner size="lg" className="mx-auto mb-3" />
        <p className="font-medium text-slate-700">
          {stage === "uploading" ? "Uploading receipt..." : "Reading receipt with AI..."}
        </p>
        <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {stage === "analyzing" && (
          <p className="text-xs text-slate-400 mt-2">Extracting vendor, amount, category, and tax info...</p>
        )}
      </div>
    );
  }

  if (stage === "done" && scanned) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Review scanned receipt</h3>
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Vendor", value: scanned.vendor },
            { label: "Amount", value: `$${(scanned.amount ?? 0).toFixed(2)}` },
            { label: "Date", value: scanned.date },
            { label: "Category", value: CATEGORY_LABELS[scanned.category as ExpenseCategory] ?? scanned.category },
            { label: "Tax Classification", value: scanned.taxClassification },
            { label: "Business %", value: `${scanned.businessPercentage ?? 100}%` },
            { label: "Deductible Amount", value: `$${(scanned.deductibleAmount ?? 0).toFixed(2)}` },
          ].map((row) => (
            <div key={row.label} className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-xs text-slate-400">{row.label}</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5 capitalize">{row.value ?? "—"}</p>
            </div>
          ))}
        </div>
        {scanned.taxNotes && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700"><strong>Tax note:</strong> {scanned.taxNotes}</p>
          </div>
        )}
        {scanned.needsMoreInfo && scanned.pendingQuestion && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800"><strong>Needs clarification:</strong> {scanned.pendingQuestion}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Receipt
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-medium text-slate-700 mb-1">
          {isDragActive ? "Drop receipt here" : "Scan a receipt"}
        </p>
        <p className="text-slate-400 text-sm">Take a photo or upload PDF/image · Max 20 MB</p>
        <p className="text-xs text-slate-400 mt-2">AI extracts vendor, amount, date, and recommends tax category</p>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const { business } = useBusiness();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");

  const loadReceipts = async () => {
    if (!business?.id) return;
    const r = await getReceipts(business.id);
    setReceipts(r);
    setLoading(false);
  };

  useEffect(() => {
    if (!business?.id) return;
    let cancelled = false;

    void getReceipts(business.id).then((result) => {
      if (cancelled) return;
      setReceipts(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [business]);

  const filtered = filter === "all" ? receipts : receipts.filter((r) => r.category === filter);

  const ytdDeductible = receipts.reduce((s, r) => s + (r.deductibleAmount ?? r.amount), 0);
  const ytdTotal = receipts.reduce((s, r) => s + r.amount, 0);
  const mileageTotal = receipts.reduce((s, r) => s + (r.associatedMileage ?? 0), 0);

  const categoryTotals = receipts.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + r.amount;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="flex justify-center py-20"><Spinner /></div>
    </div>
  );

  if (!business) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receipt Scanner</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered expense categorization and tax analysis</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Receipts", value: receipts.length.toString() },
            { label: "Total Spent", value: `$${Math.round(ytdTotal).toLocaleString()}` },
            { label: "Deductible", value: `$${Math.round(ytdDeductible).toLocaleString()}` },
            { label: "Miles Tracked", value: mileageTotal.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left column: uploader + top categories */}
          <div className="space-y-4">
            <ReceiptUploader businessId={business.id} onSaved={loadReceipts} />

            {topCategories.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top Categories</p>
                <div className="space-y-2">
                  {topCategories.map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[cat as ExpenseCategory] ?? "bg-slate-100 text-slate-500"}`}>
                          {CATEGORY_LABELS[cat as ExpenseCategory] ?? cat}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">${Math.round(amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: receipt list */}
          <div className="md:col-span-2 space-y-3">
            {/* Category filter */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({receipts.length})
              </button>
              {Object.keys(categoryTotals).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat as ExpenseCategory)}
                  className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                    filter === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {CATEGORY_LABELS[cat as ExpenseCategory] ?? cat}
                </button>
              ))}
            </div>

            {/* Receipt list */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-slate-500 text-sm">
                  {filter === "all" ? "No receipts yet. Scan your first one →" : `No ${filter} receipts.`}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filtered.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 text-sm truncate">{r.vendor || "Unknown vendor"}</p>
                        {r.needsMoreInfo && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Review</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[r.category] ?? "bg-slate-100 text-slate-500"}`}>
                          {CATEGORY_LABELS[r.category] ?? r.category}
                        </span>
                        <span className="text-xs text-slate-400">{r.date}</span>
                        {r.associatedMileage && r.associatedMileage > 0 && (
                          <span className="text-xs text-slate-400">{r.associatedMileage} mi</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-slate-900 text-sm">${r.amount.toFixed(2)}</p>
                      {r.deductibleAmount < r.amount && (
                        <p className="text-xs text-green-600">${r.deductibleAmount.toFixed(2)} deductible</p>
                      )}
                      {r.deductibleAmount >= r.amount && (
                        <p className="text-xs text-green-600">100% deductible</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
