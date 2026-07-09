import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeDispatchRequest } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeDispatchRequest(user, "POST", body);

  const { ids } = body;
  const idArray = Array.isArray(ids) ? ids : [ids];
  const results = { success: [], failed: [] };
  for (const id of idArray) {
    await mysqlPool.query("SET @resultMsg = '';");
    await mysqlPool.query("CALL sp_dispatch_restore(?, @resultMsg);", [id]);
    const [out] = await mysqlPool.query("SELECT @resultMsg as message");
    if (out[0].message === "Success") results.success.push(id); else results.failed.push(id);
  }
  return NextResponse.json({ message: "Restore completed", results });
});
