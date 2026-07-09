"use client";
// Helper components extracted from FbfFbaManagement.jsx — unchanged.
import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

export function CategoryChoice({ icon, title, description, active, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition ${active
        ? 'border-slate-900 bg-slate-950 text-white ring-2 ring-slate-200'
        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md'
        }`}
    >
      <span
        className={`rounded-lg p-2 ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
          }`}
      >
        <Icon size={20} />
      </span>
      <span>
        <span className={`block text-sm font-black ${active ? 'text-white' : 'text-slate-900'}`}>{title}</span>
        <span className={`mt-0.5 block text-xs font-medium ${active ? 'text-slate-300' : 'text-slate-500'}`}>{description}</span>
      </span>
    </button>
  );
}

export function SearchablePicker({
  label,
  placeholder,
  options,
  query,
  selectedOption,
  onQueryChange,
  onSelect,
  emptyText
}) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || selectedOption?.title === query) return options.slice(0, 8);

    return options
      .filter((option) =>
        [option.title, option.subtitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [options, query, selectedOption]);

  return (
    <div className="relative">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 120);
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </label>

      {selectedOption && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          Selected: {selectedOption.title}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm font-medium text-slate-500">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className="block w-full border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50"
              >
                <span className="block text-sm font-bold text-slate-800">{option.title}</span>
                {option.subtitle && (
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{option.subtitle}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const safeStatus = status || 'Available';
  const tone =
    safeStatus === 'FBF'
      ? 'bg-sky-100 text-sky-700 border-sky-200'
      : safeStatus === 'FBA'
        ? 'bg-violet-100 text-violet-700 border-violet-200'
        : safeStatus === 'Available'
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : safeStatus === 'Sold' || safeStatus === 'Dispatched'
            ? 'bg-rose-100 text-rose-700 border-rose-200'
            : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${tone}`}>
      {safeStatus}
    </span>
  );
}

export function SummaryTile({ icon, label, value, tone = "indigo" }) {
  const Icon = icon;
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div className={`rounded-lg border p-3 ${tones[tone] || tones.indigo}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, size = 'md', closeOnEscape = true }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (closeOnEscape && event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onClose]);

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-3xl',
    lg: 'max-w-8xl',
    xl: 'max-w-7xl'
  }[size] || 'max-w-3xl';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={`flex max-h-[92vh] w-full ${sizeClass} flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-white/10`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-xs font-medium text-slate-500">Manage stock without leaving this screen.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

