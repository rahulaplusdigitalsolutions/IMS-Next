import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, invalidateUserCache, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { removeSession } from "@/lib/sessionTracker";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { userid } = await params;
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  if (userid === user.id) throw new ApiError(400, "You cannot force-logout yourself.");
  const [rows] = await mysqlPool.query("SELECT userid, role FROM users WHERE userid = ? LIMIT 1", [userid]);
  if (!rows.length) throw new ApiError(404, "User not found.");
  if (rows[0].role === "SuperAdmin") throw new ApiError(403, "Cannot logout SuperAdmin.");

  await mysqlPool.query("UPDATE users SET forceLogoutAt = NOW() WHERE userid = ?", [userid]);
  removeSession(userid);
  invalidateUserCache(userid);
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Force Logout User" },
    { field: "Target User", newValue: userid },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "User has been logged out." });
});
