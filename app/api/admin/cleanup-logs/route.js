import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const days = Math.max(1, Math.min(365, Number(body.days) || 30));
  const [result] = await mysqlPool.query(
    "DELETE FROM useractivitylogs WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)",
    [days]
  );
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Cleanup Logs" },
    { field: "Days", newValue: days },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: `Deleted ${result.affectedRows} log entries older than ${days} days.`, deleted: result.affectedRows });
});
