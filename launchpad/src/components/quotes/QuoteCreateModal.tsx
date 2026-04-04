"use client";

import { useState } from "react";
import { addQuote } from "@/services/business-graph";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { BusinessProfile } from "@/types/business";
import type { QuoteLineItem } from "@/types/quote";

interface Props {
  business: BusinessProfile;
  onClose: () => void;
  onCreated: () => void;
}

const VEHICLE_TYPES = [
  { label: "Sedan", multiplier: 1.0 },
  { label: "SUV / Crossover", multiplier: 1.3 },
  { label: "Truck / Van", multiplier: 1.5 },
  { label: "Large SUV / Sprinter", multiplier: 1.7 },
];

type Step = "client" | "services" | "schedule" | "review";

export function QuoteCreateModal({ business, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>("client");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Services
  const [selectedServices, setSelectedServices] = useState<
    { serviceId: string; serviceName: string; basePrice: number; qty: number; vehicleMultiplier: number }[]
  >([]);
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);

  // Schedule
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledAddress, setScheduledAddress] = useState("");

  const toggleService = (svc: BusinessProfile["serviceTypes"][0]) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === svc.id);
      if (exists) return prev.filter((s) => s.serviceId !== svc.id);
      return [...prev, {
        serviceId: svc.id,
        serviceName: svc.name,
        basePrice: svc.basePrice,
        qty: 1,
        vehicleMultiplier: vehicleType.multiplier,
      }];
    });
  };

  const lineItems: QuoteLineItem[] = selectedServices.map((s) => ({
    serviceId: s.serviceId,
    serviceName: s.serviceName,
    description: s.serviceName,
    quantity: s.qty,
    unitPrice: Math.round(s.basePrice * s.vehicleMultiplier),
    total: Math.round(s.basePrice * s.vehicleMultiplier * s.qty),
    addOns: [],
  }));

  const subtotal = lineItems.reduce((sum, l) => sum + l.total, 0);
  const taxRate = 0;
  const taxAmount = 0;
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (!business?.id || lineItems.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await addQuote(business.id, {
        businessId: business.id,
        clientName,
        clientEmail,
        clientPhone,
        services: lineItems,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: "draft",
        sentAt: null,
        viewedAt: null,
        acceptedAt: null,
        paidAt: null,
        contractGenerated: false,
        contractId: null,
        contractSignedAt: null,
        stripePaymentIntentId: null,
        paymentMethod: null,
        paymentUrl: null,
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        scheduledAddress: scheduledAddress || null,
        followUpsSent: 0,
        lastFollowUpAt: null,
        nextFollowUpAt: null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote");
    } finally {
      setSaving(false);
    }
  };

  const steps: Step[] = ["client", "services", "schedule", "review"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">New Quote</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-1">
          {steps.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${i <= stepIdx ? "bg-blue-500" : "bg-slate-100"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Step 1: Client */}
          {step === "client" && (
            <>
              <p className="text-sm font-semibold text-slate-700">Client information</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name *</label>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                    type="email" placeholder="john@example.com" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                  <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                    type="tel" placeholder="(555) 000-0000" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Services */}
          {step === "services" && (
            <>
              <p className="text-sm font-semibold text-slate-700">Select services</p>
              {business.usesPersonalVehicle && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Vehicle type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VEHICLE_TYPES.map((vt) => (
                      <button key={vt.label} onClick={() => {
                        setVehicleType(vt);
                        setSelectedServices((prev) => prev.map((s) => ({ ...s, vehicleMultiplier: vt.multiplier })));
                      }}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${vehicleType.label === vt.label ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {vt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(business.serviceTypes ?? []).map((svc) => {
                  const selected = selectedServices.find((s) => s.serviceId === svc.id);
                  const price = Math.round(svc.basePrice * vehicleType.multiplier);
                  return (
                    <button key={svc.id} onClick={() => toggleService(svc)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{svc.name}</p>
                        <p className="text-xs text-slate-500">{svc.estimatedDuration} min · ${svc.supplyCost} supplies</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">${price}</p>
                    </button>
                  );
                })}
              </div>
              {selectedServices.length > 0 && (
                <p className="text-sm font-semibold text-slate-700 text-right">Subtotal: ${subtotal.toLocaleString()}</p>
              )}
            </>
          )}

          {/* Step 3: Schedule */}
          {step === "schedule" && (
            <>
              <p className="text-sm font-semibold text-slate-700">Schedule (optional)</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Date</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Time</label>
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Address</label>
                  <input value={scheduledAddress} onChange={(e) => setScheduledAddress(e.target.value)}
                    placeholder="123 Main St, Tempe AZ" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === "review" && (
            <>
              <p className="text-sm font-semibold text-slate-700">Review quote</p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Client</span>
                  <span className="font-medium text-slate-900">{clientName}</span>
                </div>
                {scheduledDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Scheduled</span>
                    <span className="font-medium text-slate-900">{scheduledDate} {scheduledTime}</span>
                  </div>
                )}
                <hr className="border-slate-200" />
                {lineItems.map((l) => (
                  <div key={l.serviceId} className="flex justify-between text-sm">
                    <span className="text-slate-700">{l.serviceName}</span>
                    <span className="font-medium text-slate-900">${l.total}</span>
                  </div>
                ))}
                <hr className="border-slate-200" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <button
            onClick={() => step === "client" ? onClose() : setStep(steps[stepIdx - 1])}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            {step === "client" ? "Cancel" : "← Back"}
          </button>
          {step !== "review" ? (
            <Button
              onClick={() => setStep(steps[stepIdx + 1])}
              disabled={step === "client" && !clientName.trim() || step === "services" && selectedServices.length === 0}
              size="sm"
            >
              Next →
            </Button>
          ) : (
            <Button onClick={handleSave} loading={saving} size="sm">
              {saving ? "Saving..." : "Create quote"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
