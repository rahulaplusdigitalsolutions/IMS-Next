"use client";

import api, { toTrimmedString } from "@/lib/client/apiClient";

export const authService = {
  getProfile: async () => {
    const res = await api.get("/auth/profile");
    return res.data;
  },

  updateProfile: async (data) => {
    const payload = {
      fullName: toTrimmedString(data.fullName),
      email: toTrimmedString(data.email),
      phone: toTrimmedString(data.phone),
    };
    const res = await api.put("/auth/profile", payload);
    return res.data;
  },

  changePassword: async (data) => {
    const payload = { oldPassword: data.oldPassword, newPassword: data.newPassword };
    const res = await api.put("/auth/change-password", payload);
    return res.data;
  },

  getBootstrapStatus: async () => {
    const res = await api.get("/auth/bootstrap-status");
    return res.data;
  },

  login: async (credentials) => {
    const res = await api.post("/auth/login", credentials);
    return res.data;
  },

  signup: async (credentials) => {
    const res = await api.post("/auth/signup", credentials);
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  logout: async () => {
    const res = await api.post("/auth/logout");
    return res.data;
  },

  getUsers: async () => {
    const res = await api.get("/users");
    return res.data;
  },

  getRoles: async () => {
    const res = await api.get("/roles");
    return res.data;
  },

  createRole: async ({ name, baseTier }) => {
    const res = await api.post("/roles", { name: toTrimmedString(name), baseTier });
    return res.data;
  },

  updateRole: async (id, { name, baseTier }) => {
    const res = await api.put(`/roles/${id}`, { name: toTrimmedString(name), baseTier });
    return res.data;
  },

  deleteRole: async (id) => {
    const res = await api.delete(`/roles/${id}`);
    return res.data;
  },

  createUser: async (data) => {
    const payload = {
      username: toTrimmedString(data.username),
      password: toTrimmedString(data.password),
      role: data.role || "User",
      roleLabel: toTrimmedString(data.roleLabel) || null,
      fullName: toTrimmedString(data.fullName),
      email: toTrimmedString(data.email),
      phone: toTrimmedString(data.phone),
      permissions: data.permissions || [],
      allow_edit_models: !!data.allow_edit_models,
      allow_edit_serials: !!data.allow_edit_serials,
      allow_edit_godown: !!data.allow_edit_godown,
      allow_create_order: !!data.allow_create_order,
      allow_edit_order_processing: !!data.allow_edit_order_processing,
      allow_edit_billing: !!data.allow_edit_billing,
      allow_edit_dispatch: !!data.allow_edit_dispatch,
      allow_edit_installations: !!data.allow_edit_installations,
      allow_edit_returns: !!data.allow_edit_returns,
      allow_edit_damaged: !!data.allow_edit_damaged,
      allow_edit_fbf_fba: !!data.allow_edit_fbf_fba,
      allow_edit_warranty: !!data.allow_edit_warranty,
      companyIds: Array.isArray(data.companyIds) ? data.companyIds : [],
      allCompaniesAccess: !!data.allCompaniesAccess,
    };
    const res = await api.post("/users", payload);
    return res.data;
  },

  updateUser: async (id, data) => {
    const payload = {
      username: toTrimmedString(data.username),
      role: data.role || "User",
      roleLabel: toTrimmedString(data.roleLabel) || null,
      fullName: toTrimmedString(data.fullName),
      email: toTrimmedString(data.email),
      phone: toTrimmedString(data.phone),
      permissions: data.permissions || [],
      allow_edit_models: !!data.allow_edit_models,
      allow_edit_serials: !!data.allow_edit_serials,
      allow_edit_godown: !!data.allow_edit_godown,
      allow_create_order: !!data.allow_create_order,
      allow_edit_order_processing: !!data.allow_edit_order_processing,
      allow_edit_billing: !!data.allow_edit_billing,
      allow_edit_dispatch: !!data.allow_edit_dispatch,
      allow_edit_installations: !!data.allow_edit_installations,
      allow_edit_returns: !!data.allow_edit_returns,
      allow_edit_damaged: !!data.allow_edit_damaged,
      allow_edit_fbf_fba: !!data.allow_edit_fbf_fba,
      allow_edit_warranty: !!data.allow_edit_warranty,
      companyIds: Array.isArray(data.companyIds) ? data.companyIds : [],
      allCompaniesAccess: !!data.allCompaniesAccess,
    };
    if (data.password && data.password.trim() !== "") {
      payload.password = data.password.trim();
    }
    const res = await api.put(`/users/${id}`, payload);
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  getActivityLogs: async (page = 1, limit = 10) => {
    const res = await api.get("/admin/activity-logs", { params: { page, limit } });
    return res.data;
  },
};
