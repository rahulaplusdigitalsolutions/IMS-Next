"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Shield, UserPlus, Save, Loader2,
  User, Mail, Phone, Receipt, Check, Lock, Settings2, Key,
  Briefcase, XCircle, ChevronLeft, ChevronRight, ShieldCheck,
} from "lucide-react";
import { printerService } from "@/lib/services/api";
import { ROLE_OPTIONS } from "@/lib/client/rbac";
import {
  PERMISSIONS_LIST, PERMISSION_GROUPS, EDIT_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS, INITIAL_FORM, ROLE_CONFIG, GROUP_COLORS,
} from "./constants";
import { Toggle } from "./parts";

const STEPS = [
  { id: "profile",  label: "Profile",        desc: "Basic info & role",        icon: User },
  { id: "features", label: "Feature Access", desc: "Module permissions",       icon: Key },
  { id: "rules",    label: "Write Rules",    desc: "Edit / delete privileges", icon: Settings2 },
];

export default function UserFormPage({ currentUser, onCurrentUserUpdate, editUser }) {
  const router = useRouter();
  const navigate = (path) => router.push(path);

  const [form, setForm] = useState(editUser ? {
    username: editUser.username || "",
    password: "",
    role: editUser.role || "User",
    fullName: editUser.fullName || "",
    email: editUser.email || "",
    phone: editUser.phone || "",
    permissions: editUser.permissions || DEFAULT_ROLE_PERMISSIONS[editUser.role || "User"] || [],
    allow_edit_models: !!editUser.allow_edit_models,
    allow_edit_serials: !!editUser.allow_edit_serials,
    allow_edit_godown: !!editUser.allow_edit_godown,
    allow_create_order: !!editUser.allow_create_order,
    allow_edit_order_processing: !!editUser.allow_edit_order_processing,
    allow_edit_billing: !!editUser.allow_edit_billing,
    allow_edit_dispatch: !!editUser.allow_edit_dispatch,
    allow_edit_installations: !!editUser.allow_edit_installations,
    allow_edit_damaged: !!editUser.allow_edit_damaged,
    allow_edit_returns: !!editUser.allow_edit_returns,
    allow_edit_fbf_fba: !!editUser.allow_edit_fbf_fba,
    allow_edit_warranty: !!editUser.allow_edit_warranty,
  } : INITIAL_FORM);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (editUser) {
        const result = await printerService.updateUser(editUser.id, form);
        const savedUser = result?.user;
        if (savedUser && currentUser && String(savedUser.id) === String(currentUser.id)) {
          onCurrentUserUpdate?.(savedUser);
        }
      } else {
        await printerService.createUser(form);
      }
      navigate("/users");
    } catch (err) {
      setError(err.message || "Unable to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Team
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            {editUser ? <Save size={13} className="text-indigo-700" /> : <UserPlus size={13} className="text-indigo-700" />}
          </div>
          <h1 className="text-sm font-extrabold text-slate-900">
            {editUser ? `Edit Account — @${editUser.username}` : "Add New Team Member"}
          </h1>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shrink-0">
        <div className="w-full flex items-center px-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex items-center gap-3 group min-w-0"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all font-black text-sm ${
                    done   ? "bg-indigo-600 border-indigo-600 text-white" :
                    active ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm" :
                             "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </div>
                  <div className="text-left hidden sm:block min-w-0">
                    <p className={`text-sm font-black leading-tight ${active ? "text-indigo-700" : done ? "text-slate-700" : "text-slate-400"}`}>
                      {s.label}
                    </p>
                    <p className={`text-xs leading-tight mt-0.5 ${active ? "text-indigo-400" : "text-slate-400"}`}>
                      {s.desc}
                    </p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-5 rounded-full transition-all ${i < step ? "bg-indigo-500" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Form content ── */}
      <div className="flex-1 py-6 px-6 overflow-auto">
        <div className="w-full space-y-5">

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium">
              <XCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {/* ── Step 0: Profile ── */}
          {step === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Role selector row */}
              <div className="px-8 pt-6 pb-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Access Role</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Choose what level of access this member gets.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {ROLE_OPTIONS.map(opt => {
                    const cfg = ROLE_CONFIG[opt.value] || {};
                    const active = form.role === opt.value;
                    const icons = { Admin: Shield, Supervisor: Briefcase, Accountant: Receipt, User, Operator: Settings2 };
                    const Icon = icons[opt.value] || User;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, role: opt.value, permissions: DEFAULT_ROLE_PERMISSIONS[opt.value] || [] }))}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all flex-1 justify-center ${
                          active ? `${cfg.bg} ${cfg.border} ${cfg.text} shadow-sm` : "border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50 bg-white"
                        }`}
                      >
                        <Icon size={15} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Identity fields — 3-col grid */}
              <div className="px-8 py-6">
                <h2 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">Identity & Credentials</h2>
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  {/* Row 1 */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Username *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" required
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="e.g. john_doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Full Name</label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Password {editUser && <span className="normal-case font-medium text-slate-400">— blank = keep current</span>}
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required={!editUser}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="+91 98765..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Feature Access ── */}
          {step === 1 && (
            form.role === "Admin" && currentUser?.role !== "SuperAdmin" ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border-2 border-indigo-100">
                  <Shield size={36} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Full Access Granted</h3>
                <p className="text-sm text-slate-500 max-w-xs">Admin bypasses all restrictions. Module permissions cannot be individually toggled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 mb-1">Feature Access</h2>
                    <p className="text-sm text-slate-500">Choose which modules this member can see and use.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = PERMISSIONS_LIST.map(p => p.id);
                      const allChecked = allIds.every(id => form.permissions.includes(id));
                      setForm(prev => ({ ...prev, permissions: allChecked ? [] : allIds }));
                    }}
                    className="shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"
                  >
                    {PERMISSIONS_LIST.every(p => form.permissions.includes(p.id)) ? "Deselect All Permissions" : "Select All Permissions"}
                  </button>
                </div>
                {PERMISSION_GROUPS.map((group) => {
                  const gc = GROUP_COLORS[group.color];
                  const groupPerms = group.permissions;
                  const allChecked = groupPerms.every(id => form.permissions.includes(id));
                  return (
                    <div key={group.name} className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${gc.border}`}>
                      <div className={`flex items-center justify-between px-5 py-3.5 ${gc.header} border-b ${gc.border}`}>
                        <div className="flex items-center gap-2.5">
                          <group.icon size={15} className={gc.icon} />
                          <span className={`text-sm font-black ${gc.text}`}>{group.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${gc.bg} ${gc.text}`}>
                            {groupPerms.filter(id => form.permissions.includes(id)).length}/{groupPerms.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => {
                              const without = prev.permissions.filter(p => !groupPerms.includes(p));
                              return { ...prev, permissions: allChecked ? without : [...without, ...groupPerms] };
                            });
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${gc.border} ${gc.bg} ${gc.text} hover:opacity-80`}
                        >
                          {allChecked ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {groupPerms.map((pId) => {
                          const perm = PERMISSIONS_LIST.find(p => p.id === pId);
                          if (!perm) return null;
                          const isChecked = form.permissions.includes(pId);
                          return (
                            <button
                              key={pId}
                              type="button"
                              onClick={() => setForm(prev => ({
                                ...prev,
                                permissions: isChecked
                                  ? prev.permissions.filter(p => p !== pId)
                                  : [...prev.permissions, pId]
                              }))}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                isChecked ? gc.checkedCard : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                isChecked ? `${gc.checked} border-transparent` : "bg-slate-100 border-slate-200"
                              }`}>
                                {isChecked && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-semibold truncate">{perm.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Step 2: Write Rules ── */}
          {step === 2 && (
            form.role === "Admin" && currentUser?.role !== "SuperAdmin" ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border-2 border-indigo-100">
                  <ShieldCheck size={36} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">All Write Access Granted</h3>
                <p className="text-sm text-slate-500 max-w-xs">Admin can edit and delete records across all modules.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 mb-1">Write Rules</h2>
                    <p className="text-sm text-slate-500">Grant write access (create / update / delete) for specific modules, independently of which modules are visible.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allEnabled = EDIT_PERMISSIONS.every(ep => form[ep.key]);
                      setForm(prev => {
                        const next = { ...prev };
                        EDIT_PERMISSIONS.forEach(ep => { next[ep.key] = !allEnabled; });
                        return next;
                      });
                    }}
                    className="shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                  >
                    {EDIT_PERMISSIONS.every(ep => form[ep.key]) ? "Disable All Write Rules" : "Enable All Write Rules"}
                  </button>
                </div>

                {/* 2-column grid of groups */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {["Printers", "Orders", "Inventory", "Operations"].map(grpName => {
                    const items = EDIT_PERMISSIONS.filter(ep => ep.group === grpName);
                    const enabledCount = items.filter(ep => form[ep.key]).length;
                    return (
                      <div key={grpName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{grpName}</span>
                          {enabledCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-black">{enabledCount} enabled</span>
                          )}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {items.map(ep => (
                            <div key={ep.key} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                                  form[ep.key] ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-100 border-slate-200 text-slate-400"
                                }`}>
                                  <ep.icon size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{ep.label}</p>
                                  <p className="text-[11px] text-slate-400">{form[ep.key] ? "Write enabled" : "Read-only"}</p>
                                </div>
                              </div>
                              <Toggle
                                checked={form[ep.key] || false}
                                onChange={(val) => setForm(prev => ({ ...prev, [ep.key]: val }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Navigation buttons — inline below form ── */}
        <div className="flex items-center justify-between gap-4 pt-2 pb-4">
          <button
            type="button"
            onClick={() => navigate("/users")}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all"
              >
                <ChevronLeft size={15} /> Previous
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
              >
                Next Step <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-70 transition-all shadow-lg shadow-slate-900/20"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : editUser ? <Save size={16} /> : <UserPlus size={16} />}
                {editUser ? "Save Changes" : "Create Account"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

