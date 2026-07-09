import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { createNotification } from "@/lib/notifications";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const { title, message, type = "info", targetRole } = body;
  if (!title || !message) throw new ApiError(400, "Title and message required.");
  const roles = ["Admin", "Supervisor", "Accountant", "User", "Operator"];
  const targets = targetRole && targetRole !== "All" ? [targetRole] : roles;
  for (const role of targets) {
    await createNotification(mysqlPool, { targetRole: role, title, message, type, priority: "high" });
  }
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Broadcast Notification" },
    { field: "Target", newValue: targetRole || "All" },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: `Notification sent to ${targetRole || "all users"}.` });
});
