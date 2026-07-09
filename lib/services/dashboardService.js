"use client";

import api from "@/lib/client/apiClient";

export const dashboardService = {
  getDashboardStats: async () => {
    try {
      const res = await api.get(`/dashboard/stats?_t=${new Date().getTime()}`);
      return res.data;
    } catch (error) {
      console.warn("Failed to fetch dashboard stats:", error.message);
      return null;
    }
  },
};
