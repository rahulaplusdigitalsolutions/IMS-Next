"use client";
import React from "react";

export default function PageHeader({ icon, title, subtitle }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-8">
      <div className="p-3 bg-indigo-50 rounded-xl">
        <Icon size={28} className="text-indigo-600" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

