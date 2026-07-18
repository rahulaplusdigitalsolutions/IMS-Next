"use client";
import React from "react";
import { ROLE_CONFIG } from "./constants";

export const RoleBadge = ({ role, label, size = "sm" }) => {
  const cfg = ROLE_CONFIG[role] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} ${size === "sm" ? "text-[10px] uppercase tracking-wider" : "text-xs"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label || role}
    </span>
  );
};

export const Avatar = ({ name, role, size = "md" }) => {
  const cfg = ROLE_CONFIG[role] || { avatar: "bg-slate-100 text-slate-600 border-slate-200" };
  const initials = name ? name.substring(0, 2).toUpperCase() : "?";
  const sz = size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-11 h-11 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-extrabold border-2 shrink-0 ${cfg.avatar}`}>
      {initials}
    </div>
  );
};

export const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none ${checked ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-200"}`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

export const DrawerTab = ({ id, label, icon: Icon, active, onClick, badge }) => (
  <button
    type="button"
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
      active ? "bg-white text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
    }`}
  >
    <Icon size={15} />
    {label}
    {badge != null && (
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${active ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}>
        {badge}
      </span>
    )}
  </button>
);

