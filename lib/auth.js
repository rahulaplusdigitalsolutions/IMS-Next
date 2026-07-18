import { mysqlPool } from "./db";
import {
  sanitizeUser,
  normalizeRole,
  safeStr,
  normalizeBusinessStatus,
  normalizeLogisticsStatus,
  verifyToken,
} from "./helpers";
import { trackActivity } from "./sessionTracker";

export const ALL_AUTHENTICATED_ROLES = ["Admin", "Supervisor", "Accountant", "User", "Operator"];
export const isSuperUser = (role) => role === "Admin";

// Thrown by the guard helpers below; route handlers catch it via `jsonError()`.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 30-second in-memory user cache — avoids a DB query on every request (ported
// from Backend4/middleware/auth.js; cached on globalThis to survive Next.js
// dev hot-reload the same way the DB pool is).
const globalForCache = globalThis;
const _userCache = globalForCache.__imsUserCache || new Map();
if (!globalForCache.__imsUserCache) globalForCache.__imsUserCache = _userCache;
const USER_CACHE_TTL = 30_000;

function _getCached(userId) {
  const entry = _userCache.get(String(userId));
  if (!entry || Date.now() > entry.exp) { _userCache.delete(String(userId)); return null; }
  return entry.user;
}
function _setCache(userId, user) {
  _userCache.set(String(userId), { user, exp: Date.now() + USER_CACHE_TTL });
}
export function invalidateUserCache(userId) {
  _userCache.delete(String(userId));
}
export function clearAllUserCache() { _userCache.clear(); }
export function getCacheSize() { return _userCache.size; }

async function getUserByToken(token) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const cached = _getCached(payload.id);
  if (cached) {
    if (cached.forceLogoutAt && new Date(cached.forceLogoutAt).getTime() > payload.iat * 1000) {
      invalidateUserCache(payload.id);
      return null;
    }
    return cached;
  }

  const [rows] = await mysqlPool.query("SELECT * FROM users WHERE userid = ? LIMIT 1", [payload.id]);
  const user = rows[0];
  if (!user) return null;
  if (user.forceLogoutAt && new Date(user.forceLogoutAt).getTime() > payload.iat * 1000) return null;
  _setCache(payload.id, user);
  return user;
}

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return null;
}

// Resolves the authenticated user (or null) for a route handler. Call this
// first in every handler — mirrors Backend4's global `attachAuthenticatedUser`.
export async function getAuthenticatedUser(request) {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await getUserByToken(token);
    if (!user) return null;
    const sanitized = sanitizeUser(user);
    if (sanitized && payload?.companyId) {
      sanitized.companyId = payload.companyId;
    }
    return sanitized;
  } catch (err) {
    console.error("[auth] getAuthenticatedUser:", err.message);
    throw new ApiError(500, "An internal server error occurred.");
  }
}

export function requireAuth(user) {
  if (!user) throw new ApiError(401, "Authentication required");
}

export function requireCompany(user) {
  requireAuth(user);
  if (!user.companyId) throw new ApiError(401, "No active company (Authentication expired)");
}

// Resolves which company a request should be scoped to, honoring an optional
// `?companyGuid=` override (used by the Dashboard's company filter for users
// who can see beyond their own active company). Returns `null` to mean
// "no company filter — show every company" (only ever returned when the
// caller is authorized for it); otherwise a specific guid to filter by.
// Admin always sees every company; anyone else needs the allCompaniesAccess
// flag explicitly set on their account.
export function hasAllCompaniesAccess(user) {
  const role = normalizeRole(user?.role);
  return !!user?.allCompaniesAccess || role === "Admin";
}

export function resolveScopedCompanyGuid(user, request) {
  requireCompany(user);
  const requested = new URL(request.url).searchParams.get("companyGuid");
  if (!requested || requested === user.companyId) return user.companyId;

  if (!hasAllCompaniesAccess(user)) throw new ApiError(403, "You do not have access to that company's data.");

  return requested === "all" ? null : requested;
}

// Composite of Backend4's global middleware chain
// (attachAuthenticatedUser -> trackActivity). Call this first in every route
// handler instead of getAuthenticatedUser() directly, so session tracking is
// never accidentally skipped.
export async function authenticateRequest(request) {
  const user = await getAuthenticatedUser(request);
  trackActivity(user, request);
  return user;
}

export function requireRoles(user, roles, message = "You do not have permission to perform this action.") {
  requireAuth(user);
  if (isSuperUser(normalizeRole(user.role))) return;
  if (!roles.includes(normalizeRole(user.role))) throw new ApiError(403, message);
}

export function requirePermission(user, permission, message = "You do not have the required power to access this feature.") {
  requireAuth(user);
  if (isSuperUser(normalizeRole(user.role))) return;
  if (user.permissions && user.permissions.includes(permission)) return;
  throw new ApiError(403, message);
}

export function requireEditPermission(user, columnName) {
  requireAuth(user);
  if (isSuperUser(normalizeRole(user.role))) return;
  if (user[columnName]) return;
  throw new ApiError(403, "You do not have permission to edit this module.");
}

export function authorizeReadWrite(user, method, { readRoles = ALL_AUTHENTICATED_ROLES, writeRoles = [], deleteRoles = null, denyMessage = "You do not have permission to perform this action.", editColumnName = null }) {
  requireAuth(user);
  const role = normalizeRole(user.role);
  if (isSuperUser(role)) return;
  const m = method.toUpperCase();
  const safeDeleteRoles = deleteRoles || writeRoles;
  const allowedRoles = ["GET", "HEAD", "OPTIONS"].includes(m) ? readRoles : m === "DELETE" ? safeDeleteRoles : writeRoles;
  if (!allowedRoles.includes(role)) {
    if (editColumnName && ["POST", "PUT", "PATCH", "DELETE"].includes(m) && user[editColumnName]) return;
    throw new ApiError(403, denyMessage);
  }
}

const ACCOUNTANT_DISPATCH_FIELDS = new Set(["id", "ids", "status", "invoiceNumber", "invoiceDate", "ewayBillNumber", "gemBillUploaded", "invoiceFilename", "ewayBillFilename", "logisticsStatus", "commission"]);
const ACCOUNTANT_ALLOWED_DISPATCH_STATUSES = new Set(["Send for Billing", "Billed", "Payment Pending", "Completed"]);
const ACCOUNTANT_ALLOWED_LOGISTICS_STATUSES = new Set([null, "", "Packing in Process", "Delivered"]);

function isPlainObject(v) { return !!v && typeof v === "object" && !Array.isArray(v); }

function getDispatchUpdatePayloads(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.updates)) return body.updates;
  if (isPlainObject(body?.updates)) return [body.updates];
  if (isPlainObject(body)) return [body];
  return [];
}

function isAccountantDispatchUpdateAllowed(update) {
  if (!isPlainObject(update)) return false;
  const keys = Object.keys(update).filter((k) => update[k] !== undefined);
  if (!keys.length || !keys.every((k) => ACCOUNTANT_DISPATCH_FIELDS.has(k))) return false;
  if (update.status !== undefined && !ACCOUNTANT_ALLOWED_DISPATCH_STATUSES.has(normalizeBusinessStatus(update.status))) return false;
  if (update.logisticsStatus !== undefined && !ACCOUNTANT_ALLOWED_LOGISTICS_STATUSES.has(normalizeLogisticsStatus(update.logisticsStatus))) return false;
  return true;
}

export function isAccountantDispatchRequest(body) {
  const updates = getDispatchUpdatePayloads(body);
  return updates.length > 0 && updates.every(isAccountantDispatchUpdateAllowed);
}

export function authorizeDispatchRequest(user, method, body) {
  requireAuth(user);
  const role = normalizeRole(user.role);
  const m = method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(m)) return;
  if (isSuperUser(role) || user.allow_edit_dispatch) return;
  if (role === "Accountant" && m === "PUT" && isAccountantDispatchRequest(body)) return;
  throw new ApiError(403, "This dispatch action is not allowed for your role.");
}

export function canManageOrderDocuments(role, docType) {
  const dt = safeStr(docType, "");
  if (isSuperUser(role)) return true;
  const standardTypes = ["invoice", "ewayBill", "pod", "gemContract"];
  if (!standardTypes.includes(dt)) return true;
  if (role === "Supervisor") return true;
  if (role === "Accountant") return ["invoice", "ewayBill", "pod"].includes(dt);
  if (role === "User" || role === "Operator") return ["gemContract", "pod"].includes(dt);
  return false;
}

export function authorizeOrdersRequest(user, method, pathname, body) {
  requireAuth(user);
  const role = normalizeRole(user.role);
  const m = method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(m)) return;
  if (isSuperUser(role)) return;
  if (m === "POST" && user.allow_create_order) return;
  if (pathname.endsWith("/payment") || pathname.endsWith("/batch-payment")) {
    if (role === "Accountant") return;
    throw new ApiError(403, "Only Admin or Accountant can update payments.");
  }
  if (["PUT", "PATCH", "DELETE"].includes(m) && user.allow_edit_order_processing) return;
  if (pathname.endsWith("/upload")) {
    if (["Admin", "Accountant", "User", "Operator"].includes(role)) return;
    throw new ApiError(403, "You cannot upload order documents.");
  }
  if (pathname.endsWith("/status")) {
    if (["Admin", "User", "Operator"].includes(role)) return;
    throw new ApiError(403, "Only Admin or Operators can update order status.");
  }
  if (pathname.endsWith("/replace")) {
    if (["Admin", "User", "Operator"].includes(role)) return;
    throw new ApiError(403, "Only Admin or Operators can replace orders.");
  }
  if (pathname.endsWith("/warranty-start")) {
    if (["Admin", "User", "Operator"].includes(role)) return;
    throw new ApiError(403, "Only Admin or Operators can update warranty dates.");
  }
  throw new ApiError(403, "This order action is not allowed for your role.");
}
