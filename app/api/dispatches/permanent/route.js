import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeDispatchRequest } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeDispatchRequest(user, "DELETE", body);

  const { ids } = body;
  const idArray = Array.isArray(ids) ? ids : [ids];
  const results = { success: [], failed: [], errors: {} };
  for (const id of idArray) {
    await mysqlPool.query("SET @resultMsg = '';");
    await mysqlPool.query("CALL sp_dispatch_permanent_delete(?, @resultMsg);", [id]);
    const [out] = await mysqlPool.query("SELECT @resultMsg as message");
    const msg = out[0].message;
    if (msg === "Success") results.success.push(id);
    else { results.failed.push(id); results.errors[id] = msg || "Unknown error"; }
  }
  return NextResponse.json({ message: "Permanent deletion completed", results });
});
