"use client";

import api from "@/lib/client/apiClient";

export const modelApprovalsService = {
  submitModelApproval: async (data) => {
    const res = await api.post("/model-approvals", data);
    return res.data;
  },

  getModelApprovals: async (status) => {
    const params = status ? { status } : {};
    const res = await api.get("/model-approvals", { params });
    return res.data;
  },

  approveModelRequest: async (guid, modelData) => {
    const res = await api.put(`/model-approvals/${guid}/approve`, modelData || {});
    return res.data;
  },

  getApprovalSerials: async (guid) => {
    const res = await api.get(`/model-approvals/${guid}/serials`);
    return res.data;
  },

  rejectModelRequest: async (guid, reason) => {
    const res = await api.put(`/model-approvals/${guid}/reject`, { reason });
    return res.data;
  },
};
