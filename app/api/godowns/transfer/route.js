import { NextResponse } from "next/server";
import crypto from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeGodowns } from "@/lib/godownsAuth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeGodowns(user, "POST");

  const { sourceGodownId, destinationGodownId, serialIds, modelName } = await parseJsonBody(request);
  if (!sourceGodownId || !destinationGodownId || !serialIds?.length) throw new ApiError(400, "Missing required fields");
  if (sourceGodownId === destinationGodownId) throw new ApiError(400, "Source and destination godowns cannot be the same");

  const [srcG] = await mysqlPool.query("SELECT godownName FROM godowns WHERE guid=?", [sourceGodownId]);
  const [dstG] = await mysqlPool.query("SELECT godownName FROM godowns WHERE guid=?", [destinationGodownId]);
  if (!srcG.length || !dstG.length) throw new ApiError(400, "Invalid godown selected");

  const [serials] = await mysqlPool.query(
    "SELECT guid, value FROM serials WHERE guid IN (?) AND godownGuid=? AND status='Available' AND isDeleted=0",
    [serialIds, sourceGodownId]
  );
  if (serials.length !== serialIds.length) throw new ApiError(400, "Some serials are no longer available in the source godown");

  const conn = await mysqlPool.getConnection();
  let transferId;
  try {
    await conn.beginTransaction();
    try {
      await conn.query("UPDATE serials SET godownGuid=? WHERE guid IN (?)", [destinationGodownId, serialIds]);
      transferId = crypto.randomUUID();
      for (const s of serials) {
        await conn.query(
          "INSERT INTO stocktransferhistory (transferId,modelName,serialNumber,fromGodown,toGodown,transferredBy) VALUES (?,?,?,?,?,?)",
          [transferId, modelName || "Unknown Model", s.value, srcG[0].godownName, dstG[0].godownName, user?.username || "System"]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } finally {
    conn.release();
  }

  await logUserActivity(
    mysqlPool,
    user,
    "Stock Transfer",
    [{ field: "model", newValue: modelName }, { field: "count", newValue: serialIds.length }, { field: "from", newValue: srcG[0].godownName }, { field: "to", newValue: dstG[0].godownName }],
    request.headers.get("x-forwarded-for") || null
  );
  return NextResponse.json({ message: "Stock transferred successfully", transferId });
});
