import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requirePermission, ApiError } from "@/lib/auth";
import { VALID_ROLES } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");
  const { id } = await params;

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
    "SELECT guid FROM roles WHERE LOWER(name)=LOWER(?) AND guid<>? AND isDeleted=0",
    [trimmedName, id]
  );
  if (dup.length > 0) throw new ApiError(400, "A role with this name already exists.");

  const [existing] = await mysqlPool.query("SELECT name FROM roles WHERE guid=? AND isDeleted=0", [id]);
  if (!existing.length) throw new ApiError(404, "Role not found.");
  const oldName = existing[0].name;

  const [result] = await mysqlPool.query(
    "UPDATE roles SET name=?, baseTier=? WHERE guid=? AND isDeleted=0",
    [trimmedName, baseTier, id]
  );
  if (result.affectedRows === 0) throw new ApiError(404, "Role not found.");

  // Keep any users already carrying this custom role label/base tier in sync.
  await mysqlPool.query(
    "UPDATE users SET roleLabel=?, role=? WHERE roleLabel=?",
    [trimmedName, baseTier, oldName]
  );

  return NextResponse.json({ message: "Role updated successfully." });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");
  const { id } = await params;

  const [result] = await mysqlPool.query("UPDATE roles SET isDeleted=1 WHERE guid=?", [id]);
  if (result.affectedRows === 0) throw new ApiError(404, "Role not found.");

  return NextResponse.json({ message: "Role deleted successfully." });
});
