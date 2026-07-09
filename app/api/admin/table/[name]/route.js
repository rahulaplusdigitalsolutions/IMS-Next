import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, getAllowedTables } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { name: tableName } = await params;

  const allowed = await getAllowedTables(mysqlPool);
  if (!allowed.includes(tableName)) throw new ApiError(400, "Invalid table");

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page")) || 0);
  const limit = 50;
  const offset = page * limit;

  const [cols] = await mysqlPool.query(`SHOW COLUMNS FROM \`${tableName}\``);
  const [[{ total }]] = await mysqlPool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
  const [rows] = await mysqlPool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);
  const pkCol = cols.find((c) => c.Key === "PRI");

  return NextResponse.json({
    columns: cols.map((c) => ({ field: c.Field, type: c.Type, key: c.Key, nullable: c.Null === "YES" })),
    rows,
    total: Number(total),
    page,
    limit,
    primaryKey: pkCol ? pkCol.Field : null,
  });
});
