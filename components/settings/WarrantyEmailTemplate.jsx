"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Save, Mail, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Plus } from "lucide-react";
import api from "@/lib/client/apiClient";

const PLACEHOLDERS = [
  { label: "Serial Numbers", value: "{{SERIAL_NUMBERS}}", desc: "All serial nos." },
  { label: "Model Name",     value: "{{MODEL_NAME}}",     desc: "Product model" },
  { label: "Invoice No.",    value: "{{INVOICE_NUMBER}}",  desc: "Invoice number" },
  { label: "Invoice Date",   value: "{{DISPATCH_DATE}}",   desc: "Invoice/dispatch date" },
  { label: "Warranty Period",value: "{{WARRANTY_PERIOD}}", desc: "e.g. 1 Year" },
  { label: "Warranty Expiry",value: "{{WARRANTY_EXPIRY}}", desc: "Calculated expiry date" },
  { label: "Customer Name",  value: "{{CUSTOMER_NAME}}",   desc: "Buyer name" },
  { label: "Consignee",      value: "{{CONSIGNEE_NAME}}",  desc: "Consignee name" },
  { label: "Address",        value: "{{ADDRESS}}",          desc: "Shipping address" },
  { label: "Order/GeM No.",  value: "{{GEM_NUMBER}}",      desc: "Order/GeM/Bid number" },
  { label: "Quantity",       value: "{{QUANTITY}}",         desc: "No. of units" },
  { label: "GST Number",     value: "{{GST_NUMBER}}",       desc: "Buyer GST" },
  { label: "Dealer Name",    value: "{{COMPANY_NAME}}",     desc: "Your company name" },
  { label: "Cert Number",    value: "{{CERT_NUMBER}}",      desc: "Auto-generated cert no." },
];

const SAMPLE = {
  "{{SERIAL_NUMBERS}}":  "CNC1V200QY, CNC1V201AB",
  "{{MODEL_NAME}}":      "HP 4104dw",
  "{{INVOICE_NUMBER}}":  "INV/2026/001",
  "{{DISPATCH_DATE}}":   "18/06/2026",
  "{{WARRANTY_PERIOD}}": "1 Year",
  "{{WARRANTY_EXPIRY}}": "18/06/2027",
  "{{CUSTOMER_NAME}}":   "Ministry of Finance",
  "{{CONSIGNEE_NAME}}":  "Dept. of Economic Affairs",
  "{{ADDRESS}}":         "North Block, New Delhi - 110001",
  "{{GEM_NUMBER}}":      "GEMC-511687780612696",
  "{{QUANTITY}}":        "2",
  "{{GST_NUMBER}}":      "07AAAFM0267G1ZX",
  "{{COMPANY_NAME}}":    "A Plus Digital Solutions",
  "{{CERT_NUMBER}}":     "WC-000123",
};

function insertAtCursor(ref, placeholder) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd   ?? el.value.length;
  const before = el.value.slice(0, start);
  const after  = el.value.slice(end);
  const newVal = before + placeholder + after;
  const newPos = start + placeholder.length;
  el.focus();
  el.value = newVal;
  el.setSelectionRange(newPos, newPos);
  // trigger React synthetic event
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeInputValueSetter) nativeInputValueSetter.call(el, newVal);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export default function WarrantyEmailTemplate() {
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const [preview, setPreview] = useState(false);

  const subjectRef = useRef(null);
  const bodyRef    = useRef(null);
  const lastFocus  = useRef("body"); // 'subject' | 'body'

  useEffect(() => {
    api.get("/warranty/template")
      .then(res => {
        setSubject(res.data.emailSubject || "");
        setBody(res.data.emailBody || "");
        setEmailTo(res.data.emailTo || "");
        setEmailCc(res.data.emailCc || "");
        setEmailBcc(res.data.emailBcc || "");
      })
      .catch(() => setError("Could not load template"))
      .finally(() => setLoading(false));
  }, []);

  const handleChipClick = useCallback((placeholder) => {
    if (lastFocus.current === "subject") {
      insertAtCursor(subjectRef, placeholder);
      setSubject(subjectRef.current?.value || "");
    } else {
      insertAtCursor(bodyRef, placeholder);
      setBody(bodyRef.current?.value || "");
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.put("/warranty/template", { emailSubject: subject, emailBody: body, emailTo, emailCc, emailBcc });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (text) => {
    let out = text;
    for (const [k, v] of Object.entries(SAMPLE)) out = out.split(k).join(v);
    return out;
  };

  if (loading) return (
    <div className="flex items-center gap-2 p-6 text-slate-500 text-sm">
      <Loader2 size={16} className="animate-spin" /> Loading template...
    </div>
  );

  return (
    <div className="max-w-9xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Mail size={16} className="text-indigo-500" /> Warranty Email Template
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Template for sending warranty registration emails to HP / vendors. Click a placeholder chip to insert it.
          </p>
        </div>
        <button
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition"
        >
          {preview ? <EyeOff size={13} /> : <Eye size={13} />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Placeholder chips */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">
          Available Placeholders — click to insert at cursor
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map(p => (
            <button
              key={p.value}
              onClick={() => handleChipClick(p.value)}
              title={`Insert ${p.value} — ${p.desc}`}
              className="flex items-center gap-1 bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2.5 py-1 rounded-full transition"
            >
              <Plus size={9} /> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* To / CC / BCC row */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              To <span className="text-slate-400 font-normal">(HP / vendor email)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. warranty.india@hp.com"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                CC <span className="text-slate-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. manager@company.com, gm@company.com"
                value={emailCc}
                onChange={e => setEmailCc(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                BCC <span className="text-slate-400 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. records@company.com"
                value={emailBcc}
                onChange={e => setEmailBcc(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Subject</label>
          {preview ? (
            <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-800 min-h-[38px]">
              {renderPreview(subject) || <span className="text-slate-400 italic">No subject set</span>}
            </div>
          ) : (
            <input
              ref={subjectRef}
              type="text"
              placeholder="e.g. Warranty Registration – {{MODEL_NAME}} – {{SERIAL_NUMBERS}}"
              value={subject}
              onFocus={() => { lastFocus.current = "subject"; }}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          )}
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Body</label>
          {preview ? (
            <div className="border border-slate-200 rounded-lg px-3 py-3 text-sm bg-slate-50 text-slate-800 min-h-[240px] whitespace-pre-wrap">
              {renderPreview(body) || <span className="text-slate-400 italic">No body set</span>}
            </div>
          ) : (
            <textarea
              ref={bodyRef}
              rows={12}
              placeholder={`Dear HP Warranty Team,\n\nWe hereby inform you that the following product has been supplied to our customer under GeM Order No. {{GEM_NUMBER}}.\n\nProduct Details:\nModel: {{MODEL_NAME}}\nSerial No(s): {{SERIAL_NUMBERS}}\nInvoice No.: {{INVOICE_NUMBER}}\nDate of Supply: {{DISPATCH_DATE}}\nWarranty Period: {{WARRANTY_PERIOD}}\nWarranty Valid Till: {{WARRANTY_EXPIRY}}\n\nKindly register the warranty in your system at the earliest.\n\nThanks & Regards,\n{{COMPANY_NAME}}`}
              value={body}
              onFocus={() => { lastFocus.current = "body"; }}
              onChange={e => setBody(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-y font-mono"
            />
          )}
        </div>
      </div>

      {/* Status + Save */}
      <div className="flex items-center justify-between">
        <div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
          {saved && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle size={12} /> Template saved successfully
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded-xl transition"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}


