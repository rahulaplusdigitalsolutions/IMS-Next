import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeSerials as authorize } from "@/lib/serialsAuth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorize(user, "PUT");
  const { id } = await params;

  const body = await parseJsonBody(request);
  const { modelId, value, status, landingPrice, landingPriceReason } = body;
  const godownGuid = body.godownGuid || body.warehouseGuid || null;

  if (value) {
    const [dup] = await mysqlPool.query("SELECT guid FROM serials WHERE value=? AND guid!=? AND isDeleted=0", [value, id]);
    if (dup.length > 0) throw new ApiError(400, "Serial exists!");
  }
  await mysqlPool.query(
    "UPDATE serials SET modelGuid=?,value=?,status=COALESCE(?,status),landingPrice=?,landingPriceReason=?,godownGuid=? WHERE guid=? AND isDeleted=0",
    [modelId, value, status || null, landingPrice || 0, landingPriceReason || null, godownGuid, id]
  );
  await logUserActivity(mysqlPool, user, "Update Serial", [{ field: "serialNumber", newValue: value }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Serial updated" });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorize(user, "DELETE");
  const { id } = await params;

  await mysqlPool.query("UPDATE serials SET isDeleted=1 WHERE guid=?", [id]);
  await logUserActivity(mysqlPool, user, "Delete Serial", [{ field: "id", oldValue: id, newValue: "Deleted" }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Serial deleted (soft)" });
});
