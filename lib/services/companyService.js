"use client";

import api from "@/lib/client/apiClient";

export const companyService = {
  getCompanies: async () => {
    try {
      const res = await api.get(`/companies?_t=${new Date().getTime()}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch companies:", error.message);
      return [];
    }
  },

  addCompany: async (data) => {
    const res = await api.post("/companies", data);
    return res.data;
  },

  updateCompany: async (id, data) => {
    const res = await api.put(`/companies/${id}`, data);
    return res.data;
  },

  deleteCompany: async (id) => {
    const res = await api.delete(`/companies/${id}`);
    return res.data;
  },

  getVendors: async () => {
    const res = await api.get(`/vendors?_t=${new Date().getTime()}`);
    return res.data;
  },

  addVendor: async (data) => {
    const res = await api.post("/vendors", data);
    return res.data;
  },
};
