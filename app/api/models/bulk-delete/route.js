import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, ALL_AUTHENTICATED_ROLES } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeReadWrite(user, "POST", {
    readRoles: ALL_AUTHENTICATED_ROLES,
    writeRoles: ["Admin", "User", "Operator"],
    deleteRoles: ["Admin"],
    denyMessage: "Only Admin or Operators can manage models.",
    editColumnName: "allow_edit_models",
  });

  const body = await parseJsonBody(request);
  const ids = Array.isArray(body.ids) ? body.ids : [body.ids];
  const results = { success: [], failed: [] };
  for (const id of ids) {
    try {
      const [check] = await mysqlPool.query("SELECT COUNT(*) as c FROM serials WHERE modelGuid=? AND isDeleted=0", [id]);
      if (check[0].c > 0) { results.failed.push({ id, reason: "Has active serials" }); continue; }
      await mysqlPool.query("UPDATE models SET isDeleted=1 WHERE guid=?", [id]);
      results.success.push(id);
    } catch (e) {
      results.failed.push({ id, reason: e.message });
    }
  }
  return NextResponse.json({ message: "Bulk delete completed", results });
});
