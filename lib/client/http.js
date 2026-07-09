"use client";

import axios from "axios";
import { clearSession, getStoredToken } from "./auth";

// Shared axios instance for the legacy `/Inventory/*` endpoints (no `/api`
// prefix). IMS-next serves these from the same origin, so baseURL is just "".
export const legacyApi = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

legacyApi.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

legacyApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) clearSession();
    return Promise.reject(error);
  }
);
