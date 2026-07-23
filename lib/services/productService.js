"use client";

import api from "@/lib/client/apiClient";
import { legacyApi } from "@/lib/client/http";

export const productService = {
  getProducts: async () => {
    const res = await api.get(`/products?_t=${new Date().getTime()}`);
    return res.data;
  },

  getStationeryItems: async () => {
    const res = await legacyApi.get(`/Inventory/GetItemList?limit=1000&_t=${new Date().getTime()}`);
    return res.data?.data || [];
  },

  addProduct: async (data) => {
    const res = await api.post("/products", data);
    return res.data;
  },

  addVariant: async (data) => {
    const res = await api.post("/variants", data);
    return res.data;
  },

  getVariantByBarcode: async (barcode) => {
    const res = await api.get(`/variants/barcode/${barcode}?_t=${new Date().getTime()}`);
    return res.data;
  },

  parseBill: async (file) => {
    const formData = new FormData();
    formData.append("billFile", file);
    const res = await api.post("/parse-bill", formData);
    return res.data;
  },

  getPurchases: async () => {
    const res = await api.get(`/purchases?_t=${new Date().getTime()}`);
    return res.data;
  },

  addPurchase: async (data) => {
    const formData = new FormData();
    formData.append("vendorId", data.vendorId);
    formData.append("totalAmount", data.totalAmount);
    if (data.purchaseDate) formData.append("purchaseDate", data.purchaseDate);
    formData.append("items", JSON.stringify(data.items));
    if (data.billFile) formData.append("billFile", data.billFile);
    const res = await api.post("/purchases", formData);
    return res.data;
  },

  getSales: async () => {
    const res = await api.get(`/sales?_t=${new Date().getTime()}`);
    return res.data;
  },

  addSale: async (data) => {
    const formData = new FormData();
    formData.append("customerName", data.customerName || "");
    formData.append("customerContact", data.customerContact || "");
    formData.append("totalAmount", data.totalAmount);
    if (data.saleDate) formData.append("saleDate", data.saleDate);
    formData.append("items", JSON.stringify(data.items));
    if (data.billFile) formData.append("billFile", data.billFile);
    const res = await api.post("/sales", formData);
    return res.data;
  },
};
