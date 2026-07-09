"use client";

import api, { toTrimmedString, toNumber } from "@/lib/client/apiClient";

export const modelsService = {
  getModels: async () => {
    try {
      const res = await api.get(`/models?_t=${new Date().getTime()}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch models:", error.message);
      return [];
    }
  },

  addModel: async (data) => {
    const payload = {
      name: toTrimmedString(data.name),
      company: toTrimmedString(data.company),
      category: data.category,
      colorType: data.colorType || "Monochrome",
      printerType: data.printerType || "Multi-Function",
      description: toTrimmedString(data.description, ""),
      mrp: toNumber(data.mrp),
      isSerialized: data.isSerialized !== false,
      stockQuantity: toNumber(data.stockQuantity),
      packagingCost: toNumber(data.packagingCost),
      mainCategory: data.mainCategory,
      cpu: data.cpu,
      ram: data.ram,
      ssd: data.ssd,
      barcode: data.barcode?.trim() || null,
      screenSize: data.screenSize || null,
      resolution: data.resolution || null,
      panelType: data.panelType || null,
      refreshRate: data.refreshRate || null,
    };
    if (!payload.name || !payload.company) throw new Error("Model name and company are required");
    const res = await api.post("/models", payload);
    return res.data;
  },

  updateModel: async (id, data) => {
    const payload = {
      name: toTrimmedString(data.name),
      company: toTrimmedString(data.company),
      category: data.category,
      colorType: data.colorType || "Monochrome",
      printerType: data.printerType || "Multi-Function",
      description: toTrimmedString(data.description, ""),
      mrp: toNumber(data.mrp),
      isSerialized: data.isSerialized !== false,
      stockQuantity: toNumber(data.stockQuantity),
      packagingCost: toNumber(data.packagingCost),
      mainCategory: data.mainCategory,
      cpu: data.cpu,
      ram: data.ram,
      ssd: data.ssd,
      barcode: data.barcode?.trim() || null,
      screenSize: data.screenSize || null,
      resolution: data.resolution || null,
      panelType: data.panelType || null,
      refreshRate: data.refreshRate || null,
    };
    const res = await api.put(`/models/${id}`, payload);
    return res.data;
  },

  onUpdateModel: async (id, data) => modelsService.updateModel(id, data),

  deleteModel: async (id) => {
    const res = await api.delete(`/models/${id}`);
    return res.data;
  },

  bulkDeleteModels: async (ids) => {
    const res = await api.post("/models/bulk-delete", { ids });
    return res.data;
  },
};
