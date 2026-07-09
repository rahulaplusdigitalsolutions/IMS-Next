import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const [rows] = await mysqlPool.query(
    `SELECT userid, username, role, fullName, email, permissions,
            allow_edit_models, allow_edit_serials, allow_edit_godown,
            allow_create_order, allow_edit_order_processing, allow_edit_billing,
            allow_edit_dispatch, allow_edit_installations, allow_edit_damaged,
            allow_edit_returns, allow_edit_fbf_fba, allow_edit_warranty, createdAt
     FROM users WHERE role != 'SuperAdmin' ORDER BY role, username`
  );
  return NextResponse.json(rows);
});
