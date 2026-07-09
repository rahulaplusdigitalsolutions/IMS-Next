import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { sanitizeUser, normalizeRole, safeStr, hashPassword } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

async function getUserCount() {
  const [rows] = await mysqlPool.query("SELECT COUNT(*) as total FROM users");
  return Number(rows[0]?.total || 0);
}

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  const { username, password, role } = await parseJsonBody(request);
  const safeUsername = safeStr(username, "");
  if (!safeUsername || !password) throw new ApiError(400, "Username and password are required.");

  const total = await getUserCount();
  if (total > 0 && normalizeRole(user?.role) !== "Admin") {
    throw new ApiError(403, "Only Admin can create users.");
  }

  const [check] = await mysqlPool.query("SELECT userid FROM users WHERE username=?", [safeUsername]);
  if (check.length > 0) throw new ApiError(400, "Username already exists.");

  const requestedRole = total === 0 ? "Admin" : normalizeRole(role);
  const hashed = await hashPassword(password);

  await mysqlPool.query(
    "INSERT INTO users (userid, username, password, role, createdAt, updatedAt) VALUES (UUID(),?,?,?,NOW(),NOW())",
    [safeUsername, hashed, requestedRole]
  );

  const [newUser] = await mysqlPool.query("SELECT * FROM users WHERE username=?", [safeUsername]);
  return NextResponse.json({
    message: total === 0 ? "Admin account created successfully." : "User created successfully.",
    user: sanitizeUser(newUser[0]),
  });
});
