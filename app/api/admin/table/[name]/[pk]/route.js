import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp, isSafeIdentifier, getAllowedTables } from "@/lib/superAdminHelpers";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { name: tableName, pk } = await params;
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const allowed = await getAllowedTables(mysqlPool);
  if (!allowed.includes(tableName)) throw new ApiError(400, "Invalid table");

  const { pkColumn, data } = body;
  if (!pkColumn || !data) throw new ApiError(400, "pkColumn and data required");
  if (!isSafeIdentifier(pkColumn)) throw new ApiError(400, "Invalid pkColumn name");

  const cols = Object.keys(data).filter((k) => k !== pkColumn);
  if (cols.length === 0) throw new ApiError(400, "No fields to update");
  const unsafeCol = cols.find((k) => !isSafeIdentifier(k));
  if (unsafeCol) throw new ApiError(400, `Invalid column name: ${unsafeCol}`);

  const setClauses = cols.map((k) => `\`${k}\` = ?`).join(", ");
  const values = [...cols.map((k) => (data[k] === "" ? null : data[k])), pk];

  await mysqlPool.query(`UPDATE \`${tableName}\` SET ${setClauses} WHERE \`${pkColumn}\` = ?`, values);
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Edit Record" },
    { field: "Table", newValue: tableName },
    { field: "Record ID", newValue: pk },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "Updated" });
});

// Deleting records from the Database Explorer is permanently disabled for
// security reasons — matches Backend4/routes/superAdmin.js.
export const DELETE = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  return NextResponse.json({ message: "Deleting records from the Database Explorer is disabled for security reasons." }, { status: 403 });
});
