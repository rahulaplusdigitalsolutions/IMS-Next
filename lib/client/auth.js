"use client";

// Ported from Frontend4/src/utils/auth.js — same localStorage keys, so an
// existing Frontend4 session (if the user ever ran both apps on the same
// origin) stays compatible.
export const USER_STORAGE_KEY = "pt_user";
export const TOKEN_STORAGE_KEY = "pt_auth_token";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

// Session storage (not localStorage) — the session ends when the tab/browser
// is closed, rather than persisting indefinitely across visits.
export function getStoredUser() {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (!canUseStorage()) return "";
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function setSession({ user, token }) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token || "");
}

export function clearSession() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}
