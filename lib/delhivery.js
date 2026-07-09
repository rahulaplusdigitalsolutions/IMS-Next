const DEFAULT_LOGIN_URL = "https://ltl-clients-api.delhivery.com/ums/login";
const DEFAULT_BASE_URL = "https://track.delhivery.com";

// Cached on globalThis to survive Next.js dev hot-reload the same way other
// process-lifetime caches (DB pool, user cache) are.
const g = globalThis;
const state = g.__imsDelhiveryAuth || { cachedAuth: null };
if (!g.__imsDelhiveryAuth) g.__imsDelhiveryAuth = state;

export function getConfig() {
  return {
    loginUrl: process.env.DELHIVERY_LOGIN_URL || DEFAULT_LOGIN_URL,
    username: process.env.DELHIVERY_USERNAME,
    password: process.env.DELHIVERY_PASSWORD,
    apiToken: process.env.DELHIVERY_API_TOKEN,
    baseUrl: (process.env.DELHIVERY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    pickupLocation: process.env.DELHIVERY_PICKUP_LOCATION,
    shipper: {
      name: process.env.DELHIVERY_SHIPPER_NAME,
      address: process.env.DELHIVERY_SHIPPER_ADDRESS,
      pincode: process.env.DELHIVERY_SHIPPER_PINCODE,
      city: process.env.DELHIVERY_SHIPPER_CITY,
      state: process.env.DELHIVERY_SHIPPER_STATE,
      phone: process.env.DELHIVERY_SHIPPER_PHONE,
      gst: process.env.DELHIVERY_SHIPPER_GST,
    },
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

export function sanitizeLoginResponse(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const json = JSON.parse(JSON.stringify(payload));
  const scrub = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (/token|jwt|password|secret/i.test(key)) {
        obj[key] = "[hidden]";
      } else {
        scrub(obj[key]);
      }
    }
  };
  scrub(json);
  return json;
}

export async function loginToDelhivery({ force = false } = {}) {
  if (!force && state.cachedAuth?.token) return state.cachedAuth;

  const config = getConfig();
  if (!config.username || !config.password) {
    throw new Error("DELHIVERY_USERNAME and DELHIVERY_PASSWORD are required in backend environment.");
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
    const message = payload?.message || payload?.error || `Delhivery login failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = sanitizeLoginResponse(payload);
    throw error;
  }

  const token = extractToken(payload);
  if (!token) {
    const error = new Error("Delhivery login succeeded but token was not found in response.");
    error.payload = sanitizeLoginResponse(payload);
    throw error;
  }

  state.cachedAuth = {
    token,
    loggedInAt: new Date().toISOString(),
    raw: payload,
  };

  return state.cachedAuth;
}

// Prefer a static API token (standard for Delhivery Express/B2C sellers) if
// configured; fall back to the username/password login flow otherwise.
async function getAuthHeader() {
  const config = getConfig();
  if (config.apiToken) return `Token ${config.apiToken}`;
  const auth = await loginToDelhivery();
  return `Bearer ${auth.token}`;
}

export async function delhiveryRequest(path, options = {}) {
  const config = getConfig();
  const authHeader = await getAuthHeader();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader,
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
    const message = payload?.rmk || payload?.message || payload?.error || `Delhivery request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function getCachedAuth() {
  return state.cachedAuth;
}
