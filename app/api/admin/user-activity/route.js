import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 200);
  const offset = parseInt(searchParams.get("offset")) || 0;
  const userId = searchParams.get("userId") || null;

  const where = userId ? "WHERE userId = ?" : "";
  const sqlParams = userId ? [userId] : [];

  const [logs] = await mysqlPool.query(
    `SELECT * FROM useractivitylogs ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...sqlParams, limit, offset]
  );
  const [[{ total }]] = await mysqlPool.query(`SELECT COUNT(*) as total FROM useractivitylogs ${where}`, sqlParams);
  return NextResponse.json({ logs, total: Number(total) });
});
