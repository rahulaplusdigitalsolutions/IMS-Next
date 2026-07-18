// Delhivery B2B (LTL/FTL freight) — a separate product from the domestic
// Express/Surface API in lib/delhivery.js, with its own account/username
// (e.g. "APLUSDIGITAL3066B2B" from the B2B portal's API Setup page) — not
// the same login as the domestic account. Always a username/password UMS
// login — no static token option like domestic has.
const DEFAULT_B2B_LOGIN_URL = "https://ltl-clients-api.delhivery.com/ums/login";

const g = globalThis;
const state = g.__imsDelhiveryB2BAuth || { cachedAuth: null };
if (!g.__imsDelhiveryB2BAuth) g.__imsDelhiveryB2BAuth = state;

export function getB2BConfig() {
  return {
    loginUrl: process.env.DELHIVERY_B2B_LOGIN_URL || DEFAULT_B2B_LOGIN_URL,
    baseUrl: (process.env.DELHIVERY_B2B_BASE_URL || "").replace(/\/$/, ""),
    username: process.env.DELHIVERY_B2B_USERNAME,
    password: process.env.DELHIVERY_B2B_PASSWORD,
  };
}

function extractToken(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.token ||
    payload.access_token ||
    payload.accessToken ||
    payload.jwt ||
    payload.data?.token ||
    payload.data?.access_token ||
    payload.data?.accessToken ||
    payload.data?.jwt ||
    null
  );
}

export async function loginToDelhiveryB2B({ force = false } = {}) {
  if (!force && state.cachedAuth?.token) return state.cachedAuth;

  const config = getB2BConfig();
  if (!config.username || !config.password) {
    throw new Error("DELHIVERY_B2B_USERNAME and DELHIVERY_B2B_PASSWORD are required for the Delhivery B2B login.");
  }

  const response = await fetch(config.loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.username,
      password: config.password,
    }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Delhivery B2B login failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const token = extractToken(payload);
  if (!token) {
    const error = new Error("Delhivery B2B login succeeded but token was not found in response.");
    error.payload = payload;
    throw error;
  }

  state.cachedAuth = {
    token,
    loggedInAt: new Date().toISOString(),
  };

  return state.cachedAuth;
}

export async function delhiveryB2BRequest(path, options = {}) {
  const config = getB2BConfig();
  if (!config.baseUrl) {
    throw new Error("DELHIVERY_B2B_BASE_URL is not configured.");
  }
  const auth = await loginToDelhiveryB2B();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const message = payload?.rmk || payload?.message || payload?.error || `Delhivery B2B request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function getCachedB2BAuth() {
  return state.cachedAuth;
}
