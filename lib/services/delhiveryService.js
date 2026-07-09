"use client";

import api from "@/lib/client/apiClient";

export const delhiveryService = {
  getConfigStatus: async () => {
    const res = await api.get("/delhivery/config-status");
    return res.data;
  },

  createShipment: async (data) => {
    const res = await api.post("/delhivery/create-shipment", data);
    return res.data;
  },

  trackShipment: async (waybill) => {
    const res = await api.get(`/delhivery/track/${encodeURIComponent(waybill)}`);
    return res.data;
  },

  requestPickup: async (data) => {
    const res = await api.post("/delhivery/pickup-request", data);
    return res.data;
  },
};
