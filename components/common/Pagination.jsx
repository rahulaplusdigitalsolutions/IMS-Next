"use client";
import React from "react";

const ACCENTS = {
  indigo: {
    select: "focus:border-indigo-400",
    nav: "hover:text-indigo-600",
    active: "bg-indigo-600 text-white shadow-md shadow-indigo-100",
    inactive: "text-slate-600 hover:bg-white hover:text-indigo-600",
  },
  fuchsia: {
    select: "focus:border-fuchsia-400",
    nav: "hover:text-fuchsia-600",
    active: "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-100",
    inactive: "text-slate-600 hover:bg-white hover:text-fuchsia-600",
  },
  rose: {
    select: "focus:border-rose-400",
    nav: "hover:text-rose-600",
    active: "bg-rose-600 text-white shadow-md shadow-rose-100",
    inactive: "text-slate-600 hover:bg-white hover:text-rose-600",
  },
};

export default function Pagination({ currentPage, pageSize, totalRecords, onPageChange, onPageSizeChange, accent = "indigo" }) {
  if (totalRecords <= 0) return null;

  const totalPages = Math.ceil(totalRecords / pageSize);
  const colors = ACCENTS[accent] || ACCENTS.indigo;

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="font-bold text-slate-700">{totalRecords}</span> entries
        </span>

        <div className="flex items-center gap-2">
          <select
            className={`bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 outline-none ${colors.select} transition-all cursor-pointer`}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[5, 10, 25, 50, 100].map(val => (
              <option key={val} value={val}>{val} per page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white ${colors.nav} disabled:opacity-30 disabled:hover:bg-transparent transition-all`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                  currentPage === pageNum ? colors.active : colors.inactive
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white ${colors.nav} disabled:opacity-30 disabled:hover:bg-transparent transition-all`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

