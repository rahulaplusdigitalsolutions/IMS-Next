import { mysqlPool } from "@/lib/db";

// Fire-and-forget insert — logging must never break the actual API response,
// so every failure here is swallowed (just console.error'd) rather than
// re-thrown.
export async function logApiRequest({ user, method, path, statusCode, isError, errorMessage, errorStack, durationMs, ipAddress }) {
  try {
    await mysqlPool.query(
      `INSERT INTO api_request_logs (userGuid, username, role, companyGuid, method, path, statusCode, isError, errorMessage, errorStack, durationMs, ipAddress)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        user?.userid || user?.id || null,
        user?.username || null,
        user?.role || null,
        user?.companyId || null,
        method,
        path,
        statusCode,
        isError ? 1 : 0,
        errorMessage ? String(errorMessage).slice(0, 2000) : null,
        errorStack ? String(errorStack).slice(0, 5000) : null,
        durationMs,
        ipAddress || null,
      ]
    );
  } catch (err) {
    console.error("[apiRequestLog] Failed to record API log:", err.message);
  }
}
