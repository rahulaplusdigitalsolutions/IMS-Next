import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, isSafeIdentifier, getAllowedTables } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { name } = await params;

  if (!isSafeIdentifier(name)) throw new ApiError(400, "Invalid table name.");
  const allowed = await getAllowedTables(mysqlPool);
  if (!allowed.includes(name)) throw new ApiError(400, "Table not found.");

  const [rows] = await mysqlPool.query(`SELECT * FROM \`${name}\` LIMIT 10000`);
  if (!rows.length) {
    return new NextResponse("", {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }
  const cols = Object.keys(rows[0]);
  const escape = (v) => (v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${name}.csv"` },
  });
});
