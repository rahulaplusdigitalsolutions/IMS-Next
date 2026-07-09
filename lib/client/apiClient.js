"use client";

import axios from "axios";
import { clearSession, getStoredToken } from "./auth";

// Ported from Frontend4/src/services/apiClient.js. IMS-next serves the API
// and the UI from the same origin (no separate backend domain), so this is
// just "/api" — no cross-origin base URL / cold-start retry config needed
// the way the old split Frontend4+Backend4 deployment required.
export const API_URL = "/api";

export const toNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isNaN(num) ? fallback : num;
};

export const toNullableNumber = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
};

export const toTrimmedString = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
};

export const toNullableString = (val) => {
  const str = toTrimmedString(val, "");
  return str ? str : null;
};

export const collapseDuplicateColumnValue = (val) => {
  if (!Array.isArray(val)) return val;
  const meaningfulValues = val.filter(
    (entry) => entry !== null && entry !== undefined && String(entry).trim() !== ""
  );
  if (meaningfulValues.length > 0) return meaningfulValues[meaningfulValues.length - 1];
  return val.length > 0 ? val[val.length - 1] : null;
};

export const toBoolean = (val) => {
  return (
    val === true || val === 1 || val === "1" || val === "true" ||
    val === "TRUE" || val === "Yes" || val === "YES" || val === "yes"
  );
};

export const normalizeDispatchStatus = (status) => {
  const safeStatus = toTrimmedString(status, "");
  if (!safeStatus) return "Pending";
  return safeStatus;
};

export const normalizeLogisticsStatus = (status) => {
  const safeStatus = toTrimmedString(status, "");
  if (!safeStatus) return null;
  if (safeStatus === "Ready for Dispatch") return "Packing in Process";
  return safeStatus;
};

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

const withAuthHeaders = (config = {}) => {
  const nextConfig = { ...config };
  nextConfig.headers = { ...(config.headers || {}) };
  const token = getStoredToken();
  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  } else {
    delete nextConfig.headers.Authorization;
  }
  return nextConfig;
};

api.interceptors.request.use(withAuthHeaders);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) clearSession();
    console.error("API Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
    const enhancedError = new Error(errorMessage);
    enhancedError.response = error.response;
    return Promise.reject(enhancedError);
  }
);

export default api;
