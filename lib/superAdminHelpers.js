import { ApiError } from "@/lib/auth";

// In-memory stores, cached on globalThis to survive Next.js dev hot-reload.
const g = globalThis;
export const otpStore = g.__imsOtpStore || new Map(); // userId -> { otp, expiresAt }
if (!g.__imsOtpStore) g.__imsOtpStore = otpStore;
export const approvalStore = g.__imsApprovalStore || new Map(); // token -> { userId, action, status, otp, expiresAt }
if (!g.__imsApprovalStore) g.__imsApprovalStore = approvalStore;

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
export function isSafeIdentifier(name) {
  return SAFE_IDENTIFIER.test(name);
}

export function verifyAndConsumeOtp(userId, otp) {
  const entry = otpStore.get(String(userId));
  if (!entry) return { valid: false, reason: "OTP not found. Please request an OTP first." };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(String(userId));
    return { valid: false, reason: "OTP has expired. Please request a new one." };
  }
  if (entry.otp !== String(otp)) return { valid: false, reason: "Incorrect OTP. Please try again." };
  otpStore.delete(String(userId));
  return { valid: true };
}

export function requireSuperAdmin(user) {
  if (!user || user.role !== "SuperAdmin") {
    throw new ApiError(403, "SuperAdmin access required");
  }
}

// Throws if the OTP in the parsed body is missing/invalid.
export function requireOtp(user, body) {
  const otp = body?.otp;
  if (!otp) throw new ApiError(400, "OTP required");
  const result = verifyAndConsumeOtp(user.id, String(otp));
  if (!result.valid) throw new ApiError(401, result.reason);
}

const AUTO_CLOSE_SCRIPT = `<script>
  (function() {
    var t = setTimeout(function() { window.close(); }, 800);
    window.onload = function() { clearTimeout(t); window.close(); };
  })();
</script>`;

export function approvedPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Approved — APDS IMS</title>${AUTO_CLOSE_SCRIPT}</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;padding:40px 24px;max-width:360px">
  <div style="width:64px;height:64px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;line-height:64px">✓</div>
  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#14532d">Action Approved</h2>
  <p style="margin:0;font-size:14px;color:#4b7c5a;line-height:1.6">Return to the SuperAdmin panel — your OTP is ready there. This tab will close automatically.</p>
</div>
</body></html>`;
}

export function rejectedPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rejected — APDS IMS</title>${AUTO_CLOSE_SCRIPT}</head>
<body style="margin:0;padding:0;background:#fef2f2;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;padding:40px 24px;max-width:360px">
  <div style="width:64px;height:64px;background:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;line-height:64px;color:#fff">✕</div>
  <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#7f1d1d">Action Rejected</h2>
  <p style="margin:0;font-size:14px;color:#9b3a3a;line-height:1.6">The action has been cancelled. No changes were made. This tab will close automatically.</p>
</div>
</body></html>`;
}

export function expiredPage() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link Expired — APDS IMS</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
  <tr><td style="background:linear-gradient(135deg,#64748b,#475569);padding:28px 32px">
    <p style="margin:0;color:#fff;font-size:20px;font-weight:700">Link Expired</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px">APDS IMS — SuperAdmin Panel</p>
  </td></tr>
  <tr><td style="padding:32px;text-align:center">
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a">This approval link has expired.</p>
    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7">Please request a new OTP from the SuperAdmin panel and try again.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function alreadyProcessedPage(status) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Already Processed</title></head><body style="margin:0;padding:48px 16px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;text-align:center"><div style="max-width:400px;margin:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px"><p style="font-size:16px;font-weight:600;color:#0f172a;margin:0 0 8px">Already ${status.charAt(0).toUpperCase() + status.slice(1)}</p><p style="color:#64748b;font-size:14px;margin:0">This request was already processed. You may close this tab.</p></div></body></html>`;
}

export const ALLOWED_COL_TYPES = new Set([
  "INT", "BIGINT", "SMALLINT", "TINYINT",
  "VARCHAR(255)", "VARCHAR(100)", "VARCHAR(50)",
  "TEXT", "LONGTEXT", "MEDIUMTEXT",
  "DECIMAL(10,2)", "DECIMAL(15,4)", "FLOAT", "DOUBLE",
  "BOOLEAN", "TINYINT(1)",
  "DATE", "DATETIME", "TIMESTAMP",
  "JSON", "UUID",
]);

export async function getAllowedTables(mysqlPool) {
  const [rows] = await mysqlPool.query("SHOW TABLES");
  return rows.map((r) => Object.values(r)[0]);
}
