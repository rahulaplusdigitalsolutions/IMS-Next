"use client";
// Reusable combobox with live filtering, extracted from NewDispatch.
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, Search, X } from "lucide-react";

// ── Searchable Select (combobox with live filter) ─────────────────────────────
export default function SearchableSelect({ value, onChange, options = [], placeholder = "Search...", disabled = false, emptyMsg = "No results found" }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const containerRef          = useRef(null);
  const inputRef              = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus input when dropdown opens
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel = options.find(o => o.value === value)?.label || "";

  const handleSelect = (opt) => { onChange(opt.value); setOpen(false); setQuery(""); };
  const handleClear  = (e)   => { e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger / display field */}
      <div
        onClick={() => { if (!disabled) setOpen(prev => !prev); }}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-all shadow-sm
          ${disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : open
              ? "border-indigo-400 ring-2 ring-indigo-400/20 bg-white shadow-md"
              : "border-slate-300/80 bg-white hover:shadow-md hover:border-slate-400"
          }`}
      >
        {open ? (
          /* Search input shown when open */
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={`Search ${placeholder}...`}
            className="flex-1 outline-none bg-transparent text-slate-800 placeholder-slate-400 text-sm"
          />
        ) : (
          <span className={selectedLabel ? "text-slate-800" : "text-slate-400"}>
            {selectedLabel || placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {value && !disabled && (
            <button onClick={handleClear} className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded">
              <X size={13} />
            </button>
          )}
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      {/* Dropdown list */}
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-center text-slate-400 text-xs font-medium">{emptyMsg}</div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2
                    ${opt.value === value
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {opt.value === value && <CheckCircle size={13} className="text-indigo-500 flex-shrink-0" />}
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

