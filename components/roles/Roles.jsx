"use client";
import React, { useEffect, useState } from "react";
import { Briefcase, Plus, Loader2, Shield, Pencil, Trash2, X, Save } from "lucide-react";
import Swal from "sweetalert2";
import { printerService } from "@/lib/services/api";
import { ROLE_OPTIONS } from "@/lib/client/rbac";

// Admin is protected — it can never be assigned as the base tier for a
// custom role (would be a privilege-escalation loophole) and, since custom
// roles only ever exist as rows in the `roles` table, the built-in Admin
// role itself is never editable/deletable through this page at all.
const ASSIGNABLE_BASE_TIERS = ROLE_OPTIONS.filter((opt) => opt.value !== "Admin");

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [baseTier, setBaseTier] = useState(ASSIGNABLE_BASE_TIERS[0]?.value || "User");
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBaseTier, setEditBaseTier] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await printerService.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Swal.fire("Name required", "Please enter a role name.", "warning");
      return;
    }
    setSaving(true);
    try {
      await printerService.createRole({ name, baseTier });
      Swal.fire("Created", "Role created successfully.", "success");
      setName("");
      await loadRoles();
    } catch (error) {
      console.error("Create role failed:", error);
      Swal.fire("Error", error?.response?.data?.message || "Failed to create role", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (role) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditBaseTier(role.baseTier);
  };

  const handleUpdate = async () => {
    if (!editName.trim()) {
      Swal.fire("Name required", "Please enter a role name.", "warning");
      return;
    }
    setUpdating(true);
    try {
      await printerService.updateRole(editingRole.guid, { name: editName, baseTier: editBaseTier });
      Swal.fire("Updated", "Role updated successfully.", "success");
      setEditingRole(null);
      await loadRoles();
    } catch (error) {
      console.error("Update role failed:", error);
      Swal.fire("Error", error?.response?.data?.message || "Failed to update role", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (role) => {
    const confirm = await Swal.fire({
      title: `Delete role "${role.name}"?`,
      text: "Users already assigned this role keep their current access, but it won't be selectable for new assignments.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;
    try {
      await printerService.deleteRole(role.guid);
      await loadRoles();
    } catch (error) {
      console.error("Delete role failed:", error);
      Swal.fire("Error", "Failed to delete role", "error");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-6">
        <Briefcase className="text-indigo-600" size={28} />
        Manage Roles
      </h2>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 max-w-2xl">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4">Create New Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Manager"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Base Tier (permission level)</label>
            <select
              value={baseTier}
              onChange={(e) => setBaseTier(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              {ASSIGNABLE_BASE_TIERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          The new role will show up with this custom name, but will get the same access permissions as the selected base tier.
          Admin cannot be used as a base tier — that access level is protected.
        </p>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          {saving ? "Creating..." : "Create Role"}
        </button>
      </div>

      <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3">Existing Custom Roles</h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 text-xs font-black text-slate-500 uppercase">Role Name</th>
              <th className="p-3 text-xs font-black text-slate-500 uppercase">Base Tier</th>
              <th className="p-3 text-xs font-black text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={20} /></td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-slate-400">No custom roles created yet</td></tr>
            ) : (
              roles.map((r) => (
                <tr key={r.guid} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-indigo-500" /> {r.name}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                      <Shield size={11} /> {r.baseTier}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(r)} className="text-indigo-500 hover:text-indigo-700" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(r)} className="text-rose-500 hover:text-rose-700" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Pencil size={18} className="text-indigo-600" /> Edit Role
              </h3>
              <button onClick={() => setEditingRole(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Role Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Base Tier</label>
                <select
                  value={editBaseTier}
                  onChange={(e) => setEditBaseTier(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                >
                  {ASSIGNABLE_BASE_TIERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
              >
                {updating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
