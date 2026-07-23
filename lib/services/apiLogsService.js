"use client";

import api from "@/lib/client/apiClient";

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const apiLogsService = {
  getApiLogs: async (params = {}) => {
    const res = await api.get("/admin/api-logs", { params });
    return res.data;
  },

  downloadApiLogs: async (params = {}) => {
    const res = await api.get("/admin/api-logs", { params: { ...params, format: "csv" }, responseType: "blob" });
    downloadBlob(res, `api-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    return true;
  },
};
