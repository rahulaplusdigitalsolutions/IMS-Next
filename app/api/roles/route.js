import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requirePermission, ApiError } from "@/lib/auth";
import { VALID_ROLES } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const [rows] = await mysqlPool.query(
    "SELECT guid, name, baseTier FROM roles WHERE isDeleted=0 ORDER BY name ASC"
  );
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const { name, baseTier } = await parseJsonBody(request);
  const trimmedName = String(name || "").trim();
  if (!trimmedName) throw new ApiError(400, "Role name is required.");
  if (baseTier === "Admin" || !VALID_ROLES.includes(baseTier)) {
    throw new ApiError(400, "Base tier must be one of: Supervisor, Accountant, User, Operator. Admin-tier custom roles are not allowed.");
  }
  if (VALID_ROLES.some((r) => r.toLowerCase() === trimmedName.toLowerCase())) {
    throw new ApiError(400, "This name is already a built-in role.");
  }

  const [dup] = await mysqlPool.query(
    "SELECT guid FROM roles WHERE LOWER(name)=LOWER(?) AND isDeleted=0",
    [trimmedName]
  );
  if (dup.length > 0) throw new ApiError(400, "A role with this name already exists.");

  const guid = randomUUID();
  await mysqlPool.query(
    "INSERT INTO roles (guid, name, baseTier, isDeleted) VALUES (?, ?, ?, 0)",
    [guid, trimmedName, baseTier]
  );
  return NextResponse.json({ message: "Role created successfully.", guid });
});
