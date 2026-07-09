import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { verifyPassword, hashPassword, logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Shared by /api/auth/password and /api/auth/change-password (Express
// registered both paths to the same handler via `router.put([...], ...)`).
export const changePassword = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  const { oldPassword, newPassword } = await parseJsonBody(request);
  if (!oldPassword || !newPassword || !newPassword.trim()) throw new ApiError(400, "Old and new password are required.");

  const [rows] = await mysqlPool.query("SELECT * FROM users WHERE userid=?", [user.id]);
  if (!rows.length) throw new ApiError(404, "User not found.");
  const cur = rows[0];

  const { ok } = await verifyPassword(oldPassword, cur.password);
  if (!ok) throw new ApiError(400, "Incorrect old password.");

  const hashed = await hashPassword(newPassword);
  await mysqlPool.query("UPDATE users SET password=? WHERE userid=?", [hashed, user.id]);
  await logUserActivity(mysqlPool, user, "Password Change", [{ field: "password", oldValue: "***", newValue: "***" }], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "Password changed successfully." });
});
