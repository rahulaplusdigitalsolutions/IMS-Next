import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requirePermission, ApiError } from "@/lib/auth";
import { sanitizeUser, normalizeRole, safeStr, hashPassword } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Mounted behind `requirePermission("users", ...)` in Backend4/index.js.
export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const [rows] = await mysqlPool.query(
    "SELECT * FROM users WHERE role != 'SuperAdmin' ORDER BY createdAt DESC, userid DESC"
  );
  return NextResponse.json(rows.map(sanitizeUser));
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const {
    username, password, role, fullName, email, phone, permissions,
    allow_edit_models, allow_edit_serials, allow_edit_godown,
    allow_create_order, allow_edit_order_processing, allow_edit_billing, allow_edit_dispatch,
    allow_edit_installations, allow_edit_damaged, allow_edit_returns, allow_edit_fbf_fba, allow_edit_warranty,
  } = await parseJsonBody(request);

  const safeUsername = safeStr(username, "");
  if (!safeUsername || !password) throw new ApiError(400, "Username and password are required.");

  if (normalizeRole(role) === "SuperAdmin") {
    throw new ApiError(403, "SuperAdmin account cannot be created from here.");
  }

  const [check] = await mysqlPool.query("SELECT userid FROM users WHERE username=?", [safeUsername]);
  if (check.length > 0) throw new ApiError(400, "Username already exists.");

  const hashed = await hashPassword(password);
  const perms = Array.isArray(permissions) ? JSON.stringify(permissions) : "[]";

  await mysqlPool.query(
    `INSERT INTO users (userid, username, password, role, fullName, email, phone, permissions,
       allow_edit_models, allow_edit_serials, allow_edit_godown,
       allow_create_order, allow_edit_order_processing, allow_edit_billing, allow_edit_dispatch,
       allow_edit_installations, allow_edit_damaged, allow_edit_returns, allow_edit_fbf_fba, allow_edit_warranty, createdAt, updatedAt)
     VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [safeUsername, hashed, normalizeRole(role), safeStr(fullName), safeStr(email), safeStr(phone), perms,
      allow_edit_models ? 1 : 0, allow_edit_serials ? 1 : 0, allow_edit_godown ? 1 : 0,
      allow_create_order ? 1 : 0, allow_edit_order_processing ? 1 : 0, allow_edit_billing ? 1 : 0,
      allow_edit_dispatch ? 1 : 0, allow_edit_installations ? 1 : 0,
      allow_edit_damaged ? 1 : 0, allow_edit_returns ? 1 : 0, allow_edit_fbf_fba ? 1 : 0, allow_edit_warranty ? 1 : 0]
  );

  const [newUser] = await mysqlPool.query("SELECT * FROM users WHERE username=?", [safeUsername]);
  return NextResponse.json({ message: "User created successfully.", user: sanitizeUser(newUser[0]) }, { status: 201 });
});
