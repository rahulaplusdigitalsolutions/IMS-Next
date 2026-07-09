import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { normalizeRole, logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { userid } = await params;
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const { role, permissions, ...toggles } = body;

  const [check] = await mysqlPool.query("SELECT role FROM users WHERE userid = ? LIMIT 1", [userid]);
  if (!check.length) throw new ApiError(404, "User not found.");
  if (check[0].role === "SuperAdmin") throw new ApiError(403, "Cannot modify SuperAdmin.");

  const newRole = normalizeRole(role);
  if (newRole === "SuperAdmin") throw new ApiError(403, "Cannot assign SuperAdmin role.");

  await mysqlPool.query(
    `UPDATE users SET role=?, permissions=?,
     allow_edit_models=?, allow_edit_serials=?, allow_edit_godown=?,
     allow_create_order=?, allow_edit_order_processing=?, allow_edit_billing=?,
     allow_edit_dispatch=?, allow_edit_installations=?, allow_edit_damaged=?,
     allow_edit_returns=?, allow_edit_fbf_fba=?, allow_edit_warranty=?, updatedAt=NOW()
     WHERE userid=?`,
    [
      newRole,
      JSON.stringify(Array.isArray(permissions) ? permissions : []),
      toggles.allow_edit_models ? 1 : 0,
      toggles.allow_edit_serials ? 1 : 0,
      toggles.allow_edit_godown ? 1 : 0,
      toggles.allow_create_order ? 1 : 0,
      toggles.allow_edit_order_processing ? 1 : 0,
      toggles.allow_edit_billing ? 1 : 0,
      toggles.allow_edit_dispatch ? 1 : 0,
      toggles.allow_edit_installations ? 1 : 0,
      toggles.allow_edit_damaged ? 1 : 0,
      toggles.allow_edit_returns ? 1 : 0,
      toggles.allow_edit_fbf_fba ? 1 : 0,
      toggles.allow_edit_warranty ? 1 : 0,
      userid,
    ]
  );
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Edit Managed User" },
    { field: "Target User", newValue: userid },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "User updated successfully." });
});
