import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { sanitizeUser, safeStr, verifyPassword, hashPassword, signToken, logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const { username, password } = await parseJsonBody(request);
  if (!username || !password) throw new ApiError(400, "Username and password are required.");

  const [rows] = await mysqlPool.query(
    "SELECT * FROM users WHERE (username=? OR email=?) LIMIT 1",
    [safeStr(username, ""), safeStr(username, "")]
  );
  if (rows.length === 0) throw new ApiError(401, "Invalid credentials");
  const user = rows[0];

  const { ok, legacy } = await verifyPassword(password, user.password);
  if (!ok) throw new ApiError(401, "Invalid credentials");

  if (legacy) {
    const newHash = await hashPassword(password);
    await mysqlPool.query("UPDATE users SET password=? WHERE userid=?", [newHash, user.userid]);
  }

  const token = signToken(user);
  await mysqlPool.query("UPDATE users SET forceLogoutAt = NULL WHERE userid = ?", [user.userid]);
  await logUserActivity(
    mysqlPool,
    { id: user.userid, username: user.username, role: user.role },
    "Login",
    [{ field: "session", newValue: "Started" }],
    request.headers.get("x-forwarded-for") || null
  );

  return NextResponse.json({ token, user: sanitizeUser(user) });
});
