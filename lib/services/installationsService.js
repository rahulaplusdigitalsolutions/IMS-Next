"use client";

import api, { toNullableString, toNumber } from "@/lib/client/apiClient";

export const installationsService = {
  getInstallations: async () => {
    try {
      const res = await api.get(`/installations?_t=${new Date().getTime()}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch installations:", error.message);
      return [];
    }
  },

  getInstallationStats: async () => {
    try {
      const res = await api.get(`/installations/stats?_t=${new Date().getTime()}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch installation stats:", error.message);
      return { total: 0, pending: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, totalCharges: 0 };
    }
  },

  getInstallationById: async (id) => {
    const res = await api.get(`/installations/${id}?_t=${new Date().getTime()}`);
    return res.data;
  },

  updateInstallation: async (id, data) => {
    const payload = {
      technicianName: toNullableString(data.technicianName),
      technicianContact: toNullableString(data.technicianContact),
      installationStatus: data.installationStatus || null,
      installationCharges: toNumber(data.installationCharges),
      installationRemarks: toNullableString(data.installationRemarks),
      scheduledDate: data.scheduledDate || null,
      installationDate: data.installationDate || null,
    };
    const res = await api.put(`/installations/${id}`, payload);
    return res.data;
  },

  bulkUpdateInstallations: async (ids, updates) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) throw new Error("No IDs provided");
    const payload = {
      ids,
      updates: {
        technicianName: updates.technicianName?.trim() || undefined,
        technicianContact: updates.technicianContact?.trim() || undefined,
        installationStatus: updates.installationStatus || undefined,
        scheduledDate: updates.scheduledDate || undefined,
      },
    };
    const res = await api.put("/installations/bulk/update", payload);
    return res.data;
  },
};
