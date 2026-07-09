import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp, isSafeIdentifier, ALLOWED_COL_TYPES, getAllowedTables } from "@/lib/superAdminHelpers";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const tables = await getAllowedTables(mysqlPool);
  const result = [];
  for (const t of tables) {
    try {
      const [[{ cnt }]] = await mysqlPool.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
      result.push({ name: t, rowCount: Number(cnt) });
    } catch {
      result.push({ name: t, rowCount: null });
    }
  }
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const { tableName, columns } = body;
  if (!tableName || !isSafeIdentifier(tableName)) throw new ApiError(400, "Invalid table name. Use only letters, numbers, underscores.");
  if (!Array.isArray(columns) || columns.length === 0) throw new ApiError(400, "At least one column is required.");

  const existing = await getAllowedTables(mysqlPool);
  if (existing.includes(tableName)) throw new ApiError(400, `Table "${tableName}" already exists.`);

  const pkCount = columns.filter((c) => c.primaryKey).length;
  if (pkCount > 1) throw new ApiError(400, "Only one primary key is allowed.");

  const colDefs = columns.map((col) => {
    if (!col.name || !isSafeIdentifier(col.name)) throw new ApiError(400, `Invalid column name: "${col.name}"`);
    if (!ALLOWED_COL_TYPES.has(col.type)) throw new ApiError(400, `Invalid column type: "${col.type}"`);

    let def = `\`${col.name}\` ${col.type}`;
    if (col.primaryKey) {
      def += " NOT NULL";
      if (col.autoIncrement) def += " AUTO_INCREMENT";
    } else {
      def += col.nullable ? " NULL" : " NOT NULL";
      if (col.defaultValue !== undefined && col.defaultValue !== "") def += ` DEFAULT '${String(col.defaultValue).replace(/'/g, "''")}'`;
    }
    return def;
  });

  const pkCol = columns.find((c) => c.primaryKey);
  if (pkCol) colDefs.push(`PRIMARY KEY (\`${pkCol.name}\`)`);

  const sql = `CREATE TABLE \`${tableName}\` (${colDefs.join(", ")})`;
  await mysqlPool.query(sql);
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Create Table" },
    { field: "Table", newValue: tableName },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: `Table "${tableName}" created successfully.`, sql });
});
