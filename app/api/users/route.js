import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requirePermission, resolveRole, ApiError } from "@/lib/auth";
import { sanitizeUser, safeStr, hashPassword } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Mounted behind `requirePermission("users", ...)` in Backend4/index.js.
export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const [rows] = await mysqlPool.query(
    "SELECT * FROM users ORDER BY createdAt DESC, userid DESC"
  );

  const [companyLinks] = rows.length
    ? await mysqlPool.query(
        `SELECT userGuid, companyGuid FROM user_companies WHERE userGuid IN (?)`,
        [rows.map((r) => r.userid)]
      )
    : [[]];
  const companyIdsByUser = {};
  companyLinks.forEach((l) => {
    (companyIdsByUser[l.userGuid] ||= []).push(l.companyGuid);
  });

  return NextResponse.json(
    rows.map((r) => ({ ...sanitizeUser(r), companyIds: companyIdsByUser[r.userid] || [] }))
  );
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");

  const {
    username, password, roleId, fullName, email, phone,
    companyIds, allCompaniesAccess,
  } = await parseJsonBody(request);

  const safeUsername = safeStr(username, "");
  if (!safeUsername || !password) throw new ApiError(400, "Username and password are required.");
  if (!roleId) throw new ApiError(400, "A role is required — pick one from Manage Roles, or Admin.");
  if (!allCompaniesAccess && (!Array.isArray(companyIds) || companyIds.length === 0)) {
    throw new ApiError(400, "Assign at least one company to this user, or they won't be able to log in.");
  }

  const [check] = await mysqlPool.query("SELECT userid FROM users WHERE username=?", [safeUsername]);
  if (check.length > 0) throw new ApiError(400, "Username already exists.");

  const { role, roleId: resolvedRoleId } = await resolveRole(roleId);
  if (!role) throw new ApiError(400, "Selected role could not be found.");

  const hashed = await hashPassword(password);

  await mysqlPool.query(
    `INSERT INTO users (userid, username, password, role, roleId, fullName, email, phone, permissions,
       allCompaniesAccess, createdAt, updatedAt)
     VALUES (UUID(),?,?,?,?,?,?,?,'[]',?,NOW(),NOW())`,
    [safeUsername, hashed, role, resolvedRoleId, safeStr(fullName), safeStr(email), safeStr(phone),
      allCompaniesAccess ? 1 : 0]
  );

  const [newUser] = await mysqlPool.query("SELECT * FROM users WHERE username=?", [safeUsername]);
  if (Array.isArray(companyIds) && companyIds.length > 0) {
    for (const cid of companyIds) {
      await mysqlPool.query("INSERT INTO user_companies (userGuid, companyGuid, isDefault) VALUES (?, ?, ?)", [newUser[0].userid, cid, cid === companyIds[0] ? 1 : 0]);
    }
  }

  return NextResponse.json({ message: "User created successfully.", user: sanitizeUser(newUser[0]) }, { status: 201 });
});
