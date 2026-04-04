"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  businessId: string;
  onClose: () => void;
}

type ContractType = "service_agreement" | "vendor_agreement" | "nda" | "independent_contractor";

const CONTRACT_TYPES: { value: ContractType; label: string; description: string }[] = [
  { value: "service_agreement", label: "Service Agreement", description: "For clients hiring you to perform services" },
  { value: "vendor_agreement", label: "Vendor Agreement", description: "For suppliers or vendors you work with" },
  { value: "nda", label: "Non-Disclosure Agreement", description: "Protect confidential business information" },
  { value: "independent_contractor", label: "Independent Contractor", description: "For contractors or freelancers you hire" },
];

export function GenerateContractModal({ businessId, onClose }: Props) {
  const [contractType, setContractType] = useState<ContractType>("service_agreement");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [customFields, setCustomFields] = useState("");
  const [generating, setGenerating] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!clientName.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      // Parse custom fields as key: value pairs
      const fields: Record<string, string> = {};
      customFields.split("\n").forEach((line) => {
        const [k, ...v] = line.split(":");
        if (k && v.length) fields[k.trim()] = v.join(":").trim();
      });

      const res = await fetch("/api/ai/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          contractType,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          customFields: Object.keys(fields).length ? fields : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const data = await res.json();
      setHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win || !html) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contractType}-${clientName.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">Generate a contract</h2>
            <p className="text-sm text-slate-500 mt-0.5">AI drafts a ready-to-sign contract in seconds</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!html ? (
            <div className="space-y-5">
              {/* Contract type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contract type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setContractType(ct.value)}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        contractType === ct.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">{ct.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ct.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Client info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Client / counterparty name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Smith or Acme Corp"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
                  <input
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    type="email"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Custom fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional details (optional)
                </label>
                <textarea
                  value={customFields}
                  onChange={(e) => setCustomFields(e.target.value)}
                  placeholder={"Service description: Full interior detail\nPrice: $195\nLocation: Client's home address"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <p className="text-xs text-slate-400 mt-1">One field per line in "Key: Value" format</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">Contract generated — review before sending</p>
              </div>
              <div
                className="border border-slate-200 rounded-xl p-5 text-sm overflow-y-auto max-h-96"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          {!html ? (
            <>
              <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={!clientName.trim()}
              >
                {generating ? "Generating..." : "Generate contract"}
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => setHtml(null)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Edit details
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Print / Save PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
