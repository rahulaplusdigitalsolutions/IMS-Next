import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { getActiveSessions } from "@/lib/sessionTracker";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const safeCount = async (table, where = "") => {
    try {
      const [[r]] = await mysqlPool.query(`SELECT COUNT(*) as n FROM \`${table}\` ${where}`);
      return Number(r.n);
    } catch {
      return null;
    }
  };
  const thisMonth = "WHERE createdAt >= DATE_FORMAT(NOW(),'%Y-%m-01')";
  const [orders, ordersMonth, dispatches, users, admins, installs, returns, logs] = await Promise.all([
    safeCount("orders"),
    safeCount("orders", thisMonth),
    safeCount("dispatches"),
    safeCount("users", "WHERE role != 'SuperAdmin'"),
    safeCount("users", "WHERE role = 'Admin'"),
    safeCount("installations"),
    safeCount("returns"),
    safeCount("useractivitylogs"),
  ]);
  let recentActivity = [];
  try {
    const [rows] = await mysqlPool.query(
      "SELECT username, role, action, createdAt, ipAddress FROM useractivitylogs ORDER BY createdAt DESC LIMIT 8"
    );
    recentActivity = rows;
  } catch {}
  return NextResponse.json({
    totals: { orders, ordersMonth, dispatches, users, admins, installs, returns, logs },
    activeSessions: getActiveSessions(30).length,
    recentActivity,
  });
});
