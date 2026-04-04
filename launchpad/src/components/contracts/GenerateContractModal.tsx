"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ContractDraftLoader } from "@/components/ui/LoadingScreen";

interface Props {
  businessId: string;
  onClose: () => void;
  /** If passed, pre-fills the wizard with quote data */
  prefill?: {
    clientName: string;
    clientEmail?: string;
    scopeDescription?: string;
    paymentAmount?: number;
  };
}

// ─── Contract types ───────────────────────────────────────────────────────────

type ContractType = "service_agreement" | "vendor_agreement" | "nda" | "independent_contractor" | "subcontractor_agreement" | "retainer_agreement" | "equipment_rental" | "partnership_agreement";

const CONTRACT_TYPES: { value: ContractType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "service_agreement",
    label: "Service Agreement",
    description: "Client hires you to perform services",
    color: "border-blue-200 bg-blue-50 hover:border-blue-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    value: "vendor_agreement",
    label: "Vendor Agreement",
    description: "Manage suppliers & vendor relationships",
    color: "border-violet-200 bg-violet-50 hover:border-violet-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  },
  {
    value: "nda",
    label: "Non-Disclosure Agreement",
    description: "Protect confidential information",
    color: "border-slate-200 bg-slate-50 hover:border-slate-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  },
  {
    value: "independent_contractor",
    label: "Independent Contractor",
    description: "Hire freelancers or 1099 contractors",
    color: "border-indigo-200 bg-indigo-50 hover:border-indigo-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    value: "subcontractor_agreement",
    label: "Subcontractor Agreement",
    description: "Pass work to another contractor",
    color: "border-orange-200 bg-orange-50 hover:border-orange-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    value: "retainer_agreement",
    label: "Monthly Retainer",
    description: "Ongoing monthly service agreement",
    color: "border-green-200 bg-green-50 hover:border-green-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    value: "equipment_rental",
    label: "Equipment Rental",
    description: "Rent equipment to or from someone",
    color: "border-yellow-200 bg-yellow-50 hover:border-yellow-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  },
  {
    value: "partnership_agreement",
    label: "Partnership Agreement",
    description: "Define roles in a joint venture",
    color: "border-pink-200 bg-pink-50 hover:border-pink-400",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
];

const PAYMENT_SCHEDULES = [
  { value: "upfront", label: "100% upfront" },
  { value: "50-50", label: "50% deposit, 50% on completion" },
  { value: "net15", label: "Net-15 (invoice due in 15 days)" },
  { value: "net30", label: "Net-30 (invoice due in 30 days)" },
  { value: "monthly", label: "Monthly billing" },
  { value: "milestone", label: "Milestone-based payments" },
];

const DURATION_OPTIONS = [
  { value: "one_time", label: "One-time / single project" },
  { value: "1_month", label: "1 month" },
  { value: "3_months", label: "3 months" },
  { value: "6_months", label: "6 months" },
  { value: "1_year", label: "1 year" },
  { value: "ongoing", label: "Ongoing (no fixed end)" },
];

const NOTICE_OPTIONS = [
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

const OPTIONAL_CLAUSES = [
  { id: "confidentiality", label: "Confidentiality / NDA clause", default: true },
  { id: "photo_rights", label: "Photo & marketing rights (use work as portfolio)", default: true },
  { id: "change_orders", label: "Change order process (scope changes must be in writing)", default: true },
  { id: "dispute_resolution", label: "Dispute resolution (mediation before litigation)", default: true },
  { id: "warranty_disclaimer", label: "Warranty disclaimer (no implied warranties)", default: false },
  { id: "non_solicitation", label: "Non-solicitation clause (no poaching employees)", default: false },
  { id: "ip_assignment", label: "IP assignment to client (transfer ownership of work product)", default: false },
  { id: "auto_renewal", label: "Auto-renewal clause", default: false },
];

// ─── Wizard steps ─────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Contract Type",
  2: "Parties & Scope",
  3: "Key Terms",
  4: "Review & Generate",
};

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100">
      {([1, 2, 3, 4] as Step[]).map((step, i) => (
        <div key={step} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center gap-1.5 ${step <= current ? "opacity-100" : "opacity-40"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${step < current ? "bg-green-500 text-white" : step === current ? "bg-blue-600 text-white scale-110" : "bg-slate-200 text-slate-500"}`}>
              {step < current ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : step}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === current ? "text-blue-600" : "text-slate-400"}`}>{STEP_LABELS[step]}</span>
          </div>
          {i < 3 && <div className={`flex-1 h-px mx-1 ${step < current ? "bg-green-300" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function GenerateContractModal({ businessId, onClose, prefill }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [contractType, setContractType] = useState<ContractType>("service_agreement");

  // Step 2
  const [clientName, setClientName] = useState(prefill?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(prefill?.clientEmail ?? "");
  const [clientCompany, setClientCompany] = useState("");
  const [scopeDescription, setScopeDescription] = useState(prefill?.scopeDescription ?? "");
  const [projectLocation, setProjectLocation] = useState("");
  const [duration, setDuration] = useState("one_time");

  // Step 3
  const [paymentAmount, setPaymentAmount] = useState(prefill?.paymentAmount ? String(prefill.paymentAmount) : "");
  const [paymentSchedule, setPaymentSchedule] = useState("net15");
  const [terminationNotice, setTerminationNotice] = useState("30");
  const [liabilityCap, setLiabilityCap] = useState<"1x" | "2x" | "none">("1x");
  const [lateFeeEnabled, setLateFeeEnabled] = useState(true);
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(
    new Set(OPTIONAL_CLAUSES.filter((c) => c.default).map((c) => c.id))
  );

  // Step 4 / generation
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleClause = (id: string) => {
    setSelectedClauses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canAdvance = (): boolean => {
    if (step === 1) return true;
    if (step === 2) return clientName.trim().length > 0;
    if (step === 3) return true;
    return false;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const contractTypeLabel = CONTRACT_TYPES.find((t) => t.value === contractType)?.label ?? contractType;
    const paymentLabel = PAYMENT_SCHEDULES.find((p) => p.value === paymentSchedule)?.label ?? paymentSchedule;
    const durationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? duration;

    const customFields: Record<string, string> = {
      "Scope of work": scopeDescription || "As discussed between parties",
      "Payment schedule": paymentLabel,
      "Project duration": durationLabel,
      "Termination notice": `${terminationNotice} days written notice`,
      "Liability cap": liabilityCap === "1x" ? "Limited to contract value" : liabilityCap === "2x" ? "Limited to 2× contract value" : "No cap specified",
      "Late payment fee": lateFeeEnabled ? "1.5% per month on overdue balances" : "None",
      "Included clauses": Array.from(selectedClauses).join(", "),
    };
    if (paymentAmount) customFields["Contract value"] = `$${paymentAmount}`;
    if (clientCompany) customFields["Client company"] = clientCompany;
    if (projectLocation) customFields["Project location"] = projectLocation;

    try {
      const res = await fetch("/api/ai/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          contractType,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          customFields,
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

  const handleSaveToVault = async () => {
    if (!html) return;
    setSaving(true);
    setError(null);
    const contractTypeLabel = CONTRACT_TYPES.find((t) => t.value === contractType)?.label ?? contractType;
    try {
      const res = await fetch(`/api/data/businesses/${businessId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${contractType}-${clientName.replace(/\s+/g, "-").toLowerCase()}.html`,
          fileUrl: "",
          fileType: "generated",
          contractType,
          counterpartyName: clientName.trim(),
          autoRenews: selectedClauses.has("auto_renewal"),
          healthScore: 100,
          status: "draft",
          analysis: { summary: `Generated ${contractTypeLabel} for ${clientName}${clientCompany ? ` (${clientCompany})` : ""}` },
          obligations: [],
          generatedHtml: html,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save contract");
      }
      const { id } = await res.json();
      onClose();
      router.push(`/contracts/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to vault");
    } finally {
      setSaving(false);
    }
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

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win || !html) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const selectedType = CONTRACT_TYPES.find((t) => t.value === contractType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Generate a contract</h2>
            <p className="text-xs text-slate-400 mt-0.5">Attorney-grade · AI-drafted · Ready to sign</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator (hidden when previewing or generating) */}
        {!html && !generating && <StepIndicator current={step} />}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Generating loading screen */}
          {generating && <ContractDraftLoader />}

          {/* Preview */}
          {!generating && html && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4 animate-slide-up">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Contract ready — review before saving</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-5 text-sm overflow-y-auto max-h-80 bg-white shadow-inner" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}

          {/* Step 1: Contract Type */}
          {!generating && !html && step === 1 && (
            <div className="px-6 py-5">
              <p className="text-sm font-medium text-slate-700 mb-3">What kind of contract do you need?</p>
              <div className="grid grid-cols-2 gap-2">
                {CONTRACT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setContractType(ct.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all duration-150 ${contractType === ct.value ? "border-blue-500 bg-blue-50 shadow-sm" : ct.color}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${contractType === ct.value ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                        {ct.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${contractType === ct.value ? "text-blue-700" : "text-slate-800"}`}>{ct.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-tight">{ct.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Parties & Scope */}
          {!generating && !html && step === 2 && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedType?.color.includes("blue") ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                  {selectedType?.icon}
                </div>
                <p className="text-sm font-medium text-blue-800">{selectedType?.label}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    {contractType === "subcontractor_agreement" || contractType === "independent_contractor" ? "Contractor name" : contractType === "partnership_agreement" ? "Partner name" : "Client name"} <span className="text-red-500">*</span>
                  </label>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Jane Smith" className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email (optional)</label>
                  <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" type="email" className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Company (optional)</label>
                  <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Acme Corp" className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Service location (optional)</label>
                  <input value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} placeholder="Miami, FL" className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Describe the scope of work
                </label>
                <textarea
                  value={scopeDescription}
                  onChange={(e) => setScopeDescription(e.target.value)}
                  placeholder={`What exactly are you providing? Be specific — the AI will use this directly in the contract.\n\nExample: Full interior and exterior vehicle detailing including hand wash, clay bar treatment, paint correction, ceramic coating, and interior deep clean.`}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
                  rows={4}
                />
                <p className="text-xs text-slate-400 mt-1">The more specific you are, the stronger your contract protection.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Duration / timeline</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button key={d.value} onClick={() => setDuration(d.value)} className={`py-2 px-3 text-xs rounded-lg border text-center transition-all ${duration === d.value ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Key Terms */}
          {!generating && !html && step === 3 && (
            <div className="px-6 py-5 space-y-5">
              {/* Payment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Payment & compensation</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Contract value (optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="w-full h-9 pl-7 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Payment schedule</label>
                    <select value={paymentSchedule} onChange={(e) => setPaymentSchedule(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {PAYMENT_SCHEDULES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <div onClick={() => setLateFeeEnabled(!lateFeeEnabled)} className={`w-8 h-4.5 rounded-full relative transition-colors ${lateFeeEnabled ? "bg-blue-500" : "bg-slate-300"}`} style={{ height: "18px" }}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${lateFeeEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs text-slate-600">Include 1.5%/month late payment fee</span>
                </label>
              </div>

              {/* Termination */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Termination notice required</label>
                <div className="flex gap-2">
                  {NOTICE_OPTIONS.map((n) => (
                    <button key={n.value} onClick={() => setTerminationNotice(n.value)} className={`flex-1 py-2 text-xs rounded-lg border transition-all ${terminationNotice === n.value ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liability */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Liability cap</label>
                <div className="flex gap-2">
                  {(["1x", "2x", "none"] as const).map((cap) => (
                    <button key={cap} onClick={() => setLiabilityCap(cap)} className={`flex-1 py-2 text-xs rounded-lg border transition-all ${liabilityCap === cap ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {cap === "1x" ? "1× contract value" : cap === "2x" ? "2× contract value" : "No cap"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">Limits how much you can be sued for. "1× contract" is the industry standard.</p>
              </div>

              {/* Optional clauses */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Include these clauses</label>
                <div className="space-y-2">
                  {OPTIONAL_CLAUSES.map((clause) => (
                    <label key={clause.id} className="flex items-start gap-2.5 cursor-pointer group">
                      <div onClick={() => toggleClause(clause.id)} className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedClauses.has(clause.id) ? "bg-blue-500 border-blue-500" : "border-slate-300 group-hover:border-slate-400"}`}>
                        {selectedClauses.has(clause.id) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{clause.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review summary */}
          {!generating && !html && step === 4 && (
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-500">Review your contract settings, then generate.</p>

              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                {[
                  { label: "Contract type", value: CONTRACT_TYPES.find((t) => t.value === contractType)?.label },
                  { label: "For", value: clientCompany ? `${clientName} (${clientCompany})` : clientName },
                  { label: "Duration", value: DURATION_OPTIONS.find((d) => d.value === duration)?.label },
                  { label: "Payment", value: PAYMENT_SCHEDULES.find((p) => p.value === paymentSchedule)?.label },
                  { label: "Contract value", value: paymentAmount ? `$${parseFloat(paymentAmount).toLocaleString()}` : "Not specified" },
                  { label: "Termination notice", value: `${terminationNotice} days` },
                  { label: "Liability cap", value: liabilityCap === "1x" ? "1× contract value" : liabilityCap === "2x" ? "2× contract value" : "None" },
                  { label: "Clauses included", value: `${selectedClauses.size} of ${OPTIONAL_CLAUSES.length}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className="text-sm font-medium text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>

              {scopeDescription && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Scope of work</p>
                  <p className="text-xs text-blue-600 leading-relaxed">{scopeDescription}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}
            </div>
          )}

          {error && !generating && html && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          {/* Preview state footer */}
          {html && !generating && (
            <>
              <button onClick={() => { setHtml(null); setStep(4); }} className="text-sm text-slate-500 hover:text-slate-700">
                ← Edit
              </button>
              <div className="flex gap-2">
                <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <Button onClick={handleSaveToVault} loading={saving}>
                  Save to Vault
                </Button>
              </div>
            </>
          )}

          {/* Wizard navigation */}
          {!html && !generating && (
            <>
              <button onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : onClose()} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                {step === 1 ? "Cancel" : "← Back"}
              </button>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance()}>
                  Continue →
                </Button>
              ) : (
                <Button onClick={handleGenerate} disabled={generating}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.13A3.5 3.5 0 0112 18.5a3.5 3.5 0 01-3.093-1.47l-.347-.13z" />
                    </svg>
                    Generate Contract
                  </span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
