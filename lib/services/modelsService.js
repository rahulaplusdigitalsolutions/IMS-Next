"use client";

import api, { toNumber } from "@/lib/client/apiClient";

// The legacy `models` table has been retired — the Models master UI is gone
// and every product lives in Item Master now. `getModels` still backs the
// unified product pickers (Dispatch, New Order, FBF/FBA), and `updateModel`
// only ever handles Dispatch's inline price edit (both proxy straight to
// app/api/models/route.js and [id]/route.js, which now read/write
// inventoryitemvariant).
export const modelsService = {
  getModels: async (companyGuid) => {
    try {
      const cg = companyGuid ? `&companyGuid=${encodeURIComponent(companyGuid)}` : "";
      const res = await api.get(`/models?_t=${new Date().getTime()}${cg}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch models:", error.message);
      return [];
    }
  },

  updateModel: async (id, data) => {
    const res = await api.put(`/models/${id}`, { mrp: toNumber(data.mrp) });
    return res.data;
  },

  onUpdateModel: async (id, data) => modelsService.updateModel(id, data),
};
