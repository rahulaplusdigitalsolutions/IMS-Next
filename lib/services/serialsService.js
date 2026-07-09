"use client";

import api, { toTrimmedString, toNumber, toNullableString } from "@/lib/client/apiClient";

export const serialsService = {
  getSerials: async () => {
    try {
      const res = await api.get(`/serials?_t=${new Date().getTime()}`);
      return res.data.map((item) => ({
        ...item,
        serialNumber: item.value || item.serialNumber,
        model: item.modelName
          ? {
              id: item.modelId,
              guid: item.modelGuid,
              name: item.modelName,
              company: item.companyName,
              category: item.modelCategory,
            }
          : null,
        godownName: item.godownName || item.warehouseName || item.warehouse_name || null,
        godownGuid: item.godownGuid || item.warehouseGuid || item.warehouse_guid || null,
        warehouseName: item.godownName || item.warehouseName || item.warehouse_name || (typeof item.warehouse === "string" ? item.warehouse : item.warehouse?.name) || null,
        warehouseGuid: item.godownGuid || item.warehouseGuid || item.warehouse_guid || (typeof item.warehouse === "object" ? item.warehouse.guid || item.warehouse.id : null) || null,
      }));
    } catch (error) {
      console.warn("Failed to fetch serials:", error.message);
      return [];
    }
  },

  addSerial: async (data) => {
    const payload = {
      modelId: data.modelId,
      value: toTrimmedString(data.value || data.serialNumber),
      landingPrice: toNumber(data.landingPrice),
      landingPriceReason: toNullableString(data.landingPriceReason),
      godownGuid: toNullableString(data.godownGuid || data.warehouseGuid),
      warehouseGuid: toNullableString(data.godownGuid || data.warehouseGuid),
    };
    if (!payload.value || !payload.modelId) throw new Error("Serial number and model are required");
    const res = await api.post("/serials", payload);
    return res.data;
  },

  updateSerial: async (id, data) => {
    const payload = {
      value: toTrimmedString(data.value || data.serialNumber),
      landingPrice: toNumber(data.landingPrice),
      modelId: data.modelId,
      landingPriceReason: toNullableString(data.landingPriceReason),
      godownGuid: toNullableString(data.godownGuid || data.warehouseGuid),
      warehouseGuid: toNullableString(data.godownGuid || data.warehouseGuid),
    };
    const res = await api.put(`/serials/${id}`, payload);
    return res.data;
  },

  deleteSerial: async (id) => {
    const res = await api.delete(`/serials/${id}`);
    return res.data;
  },

  bulkAddSerials: async (serials) => {
    const safeSerialsData = serials.map((s) => ({
      ...s,
      value: s.value || s.serialNumber,
      landingPriceReason: toNullableString(s.landingPriceReason),
      godownGuid: toNullableString(s.godownGuid || s.warehouseGuid),
      warehouseGuid: toNullableString(s.godownGuid || s.warehouseGuid),
    }));
    const res = await api.post("/serials/bulk", { serials: safeSerialsData });
    return res.data;
  },

  bulkDeleteSerials: async (ids) => {
    const res = await api.post("/serials/bulk-delete", { ids });
    return res.data;
  },

  getGodowns: async () => {
    const res = await api.get(`/godowns?_t=${new Date().getTime()}`);
    return res.data;
  },

  addGodown: async (data) => {
    const res = await api.post("/godowns", {
      godownName: toTrimmedString(data.godownName),
      godownAddress: toTrimmedString(data.godownAddress, ""),
      isDefault: Boolean(data.isDefault),
    });
    return res.data;
  },

  updateGodown: async (id, data) => {
    const res = await api.put(`/godowns/${id}`, {
      godownName: toTrimmedString(data.godownName),
      godownAddress: toTrimmedString(data.godownAddress, ""),
      isDefault: Boolean(data.isDefault),
    });
    return res.data;
  },

  deleteGodown: async (id) => {
    const res = await api.delete(`/godowns/${id}`);
    return res.data;
  },

  getGodownModels: async (godownId) => {
    const res = await api.get(`/godowns/${godownId}/models`);
    return res.data;
  },

  getGodownModelSerials: async (godownId, modelId) => {
    const res = await api.get(`/godowns/${godownId}/models/${modelId}/serials`);
    return res.data;
  },

  transferGodownStock: async (payload) => {
    const res = await api.post("/godowns/transfer", payload);
    return res.data;
  },

  getGodownTransferHistory: async (page = 1, limit = 20) => {
    const res = await api.get(`/godowns/transfer-history?page=${page}&limit=${limit}`);
    return res.data;
  },

  uploadSerialsExcel: async (file, targetModelId = "") => {
    if (!file) throw new Error("No file selected");
    const formData = new FormData();
    formData.append("file", file);
    if (targetModelId) formData.append("targetModelId", targetModelId);
    const res = await api.post("/serials/upload-excel", formData, { timeout: 60000 });
    return res.data;
  },

  downloadSerialTemplate: async () => {
    const res = await api.get("/serials/download-template", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "serial_upload_template.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  exportSerialsExcel: async () => {
    const res = await api.get(`/serials/export-excel?_t=${new Date().getTime()}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `serials_export_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};
