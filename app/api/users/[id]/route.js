import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requirePermission, isSuperUser, invalidateUserCache, ApiError } from "@/lib/auth";
import { sanitizeUser, normalizeRole, safeStr, hashPassword } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");
  const { id } = await params;

  const {
    username, password, role, roleLabel, fullName, email, phone, permissions,
    allow_edit_models, allow_edit_serials, allow_edit_godown,
    allow_create_order, allow_edit_order_processing, allow_edit_billing, allow_edit_dispatch,
    allow_edit_installations, allow_edit_damaged, allow_edit_returns, allow_edit_fbf_fba, allow_edit_warranty,
    companyIds, allCompaniesAccess,
  } = await parseJsonBody(request);

  const [existing] = await mysqlPool.query("SELECT * FROM users WHERE userid=?", [id]);
  if (!existing.length) throw new ApiError(404, "User not found.");
  const cur = existing[0];

  const nextUsername = safeStr(username, cur.username);
  const nextPassword = password && password.trim() !== "" ? await hashPassword(password) : cur.password;
  const nextRole = normalizeRole(role || cur.role);
  const nextRoleLabel = roleLabel !== undefined ? safeStr(roleLabel) : cur.roleLabel;
  const nextPerms = Array.isArray(permissions) ? JSON.stringify(permissions) : cur.permissions || "[]";

  const [dup] = await mysqlPool.query("SELECT userid FROM users WHERE username=? AND userid<>?", [nextUsername, id]);
  if (dup.length > 0) throw new ApiError(400, "Username already exists.");
  if (String(id) === String(user.id) && !isSuperUser(nextRole) && isSuperUser(cur.role)) {
    throw new ApiError(400, "You cannot remove your own elevated access.");
  }
  if (String(id) === String(user.id) && nextRole !== "Admin" && cur.role === "Admin") {
    throw new ApiError(400, "You cannot remove your own Admin access.");
  }

  const b = (flag, fallback) => (flag !== undefined ? (flag ? 1 : 0) : fallback);

  await mysqlPool.query(
    `UPDATE users SET username=?, password=?, role=?, roleLabel=?, fullName=?, email=?, phone=?, permissions=?,
       allow_edit_models=?, allow_edit_serials=?, allow_edit_godown=?,
       allow_create_order=?, allow_edit_order_processing=?, allow_edit_billing=?, allow_edit_dispatch=?,
       allow_edit_installations=?, allow_edit_damaged=?, allow_edit_returns=?, allow_edit_fbf_fba=?, allow_edit_warranty=?,
       allCompaniesAccess=?, updatedAt=NOW()
     WHERE userid=?`,
    [nextUsername, nextPassword, nextRole, nextRoleLabel, safeStr(fullName, cur.fullName), safeStr(email, cur.email),
      safeStr(phone, cur.phone), nextPerms,
      b(allow_edit_models, cur.allow_edit_models), b(allow_edit_serials, cur.allow_edit_serials),
      b(allow_edit_godown, cur.allow_edit_godown),
      b(allow_create_order, cur.allow_create_order), b(allow_edit_order_processing, cur.allow_edit_order_processing),
      b(allow_edit_billing, cur.allow_edit_billing), b(allow_edit_dispatch, cur.allow_edit_dispatch),
      b(allow_edit_installations, cur.allow_edit_installations), b(allow_edit_damaged, cur.allow_edit_damaged),
      b(allow_edit_returns, cur.allow_edit_returns), b(allow_edit_fbf_fba, cur.allow_edit_fbf_fba),
      b(allow_edit_warranty, cur.allow_edit_warranty), b(allCompaniesAccess, cur.allCompaniesAccess), id]
  );
  if (companyIds && Array.isArray(companyIds)) {
    await mysqlPool.query("DELETE FROM user_companies WHERE userGuid=?", [id]);
    for (const cid of companyIds) {
      await mysqlPool.query("INSERT INTO user_companies (userGuid, companyGuid, isDefault) VALUES (?, ?, ?)", [id, cid, cid === companyIds[0] ? 1 : 0]);
    }
  }

  invalidateUserCache(id);
  const [updated] = await mysqlPool.query("SELECT * FROM users WHERE userid=?", [id]);
  return NextResponse.json({ message: "User updated successfully.", user: sanitizeUser(updated[0]) });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requirePermission(user, "users", "User management access required.");
  const { id } = await params;

  if (String(id) === String(user.id)) throw new ApiError(400, "You cannot delete your own account.");

  const [target] = await mysqlPool.query("SELECT * FROM users WHERE userid=?", [id]);
  if (!target.length) throw new ApiError(404, "User not found.");

  if (normalizeRole(target[0].role) === "Admin") {
    const [admins] = await mysqlPool.query("SELECT COUNT(*) as total FROM users WHERE role='Admin'");
    if (Number(admins[0].total) <= 1) throw new ApiError(400, "At least one Admin account must remain.");
  }

  await mysqlPool.query("DELETE FROM users WHERE userid=?", [id]);
  return NextResponse.json({ message: "User deleted successfully." });
});
