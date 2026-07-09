"use client";

import api from "@/lib/client/apiClient";
import { legacyApi } from "@/lib/client/http";

export const tagsService = {
  updateAppearance: async (id, data) => {
    const res = await api.put(`/dispatches/${id}/appearance`, data);
    return res.data;
  },

  updateReturnAppearance: async (id, data) => {
    const res = await api.put(`/returns/${id}/appearance`, data);
    return res.data;
  },

  updateStationeryAppearance: async (data) => {
    // Unprefixed /Inventory/* route (app/Inventory/**) — needs legacyApi, not api.
    const res = await legacyApi.post("/Inventory/UpdateAppearance", data);
    return res.data;
  },

  updateBatchAppearance: async (ids, data) => {
    const res = await api.post("/dispatches/batch/appearance", { ids, ...data });
    return res.data;
  },

  getGlobalTags: async () => {
    const res = await api.get("/global-tags");
    return res.data;
  },

  createGlobalTag: async (tagData) => {
    const res = await api.post("/global-tags", tagData);
    return res.data;
  },

  deleteGlobalTag: async (id, module) => {
    const res = await api.delete(`/global-tags/${id}?module=${module}`);
    return res.data;
  },
};
