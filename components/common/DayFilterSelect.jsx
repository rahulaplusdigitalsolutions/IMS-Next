"use client";
import React from "react";
import { DAY_FILTER_OPTIONS } from "@/lib/client/dayFilter";

// Consistent "day filter" dropdown reused across Order Processing, Billing,
// Dispatch, Stock In, and Damaged — same options/behavior as the Dashboard's
// own day filter so a period picked there means the same thing everywhere.
export default function DayFilterSelect({ value, onChange, customStart, onCustomStartChange, customEnd, onCustomEndChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer w-fit"
      >
        {DAY_FILTER_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart || ""}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customEnd || ""}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      )}
    </div>
  );
}
