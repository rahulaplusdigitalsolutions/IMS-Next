"use client";

import api from "@/lib/client/apiClient";

// Delhivery B2B (LTL/FTL freight) — separate product/API from the domestic
// delhiveryService. Shipment/manifest/tracking endpoints will be added here
// once the B2B API docs + credentials are available.
export const delhiveryB2BService = {
  getConfigStatus: async () => {
    const res = await api.get("/delhivery-b2b/config-status");
    return res.data;
  },
};
