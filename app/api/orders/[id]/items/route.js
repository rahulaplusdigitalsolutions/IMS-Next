import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { mapDispatchRow, recordSerialMovement } from "@/lib/helpers";
import { ORDER_SELECT } from "@/lib/ordersQuery";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, null);
  requireAuth(user);
  const { id: orderGuid } = await params;

  const { newSerialId, sellingPrice, warranty, addedBy } = await parseJsonBody(request);
  if (!newSerialId) throw new ApiError(400, "newSerialId is required");

  const [orderRows] = await mysqlPool.query("SELECT guid, platform, customerName FROM orders WHERE guid=? AND isDeleted=0", [orderGuid]);
  if (!orderRows.length) throw new ApiError(404, "Order not found");
  const order = orderRows[0];

  const [serRows] = await mysqlPool.query("SELECT * FROM serials WHERE guid=? AND isDeleted=0", [newSerialId]);
  if (!serRows.length) throw new ApiError(404, "Serial not found");
  if (serRows[0].status !== "Available") throw new ApiError(400, "Selected serial is not Available");

  const newItemGuid = randomUUID();

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO order_items (guid,orderGuid,serialNumberGuid,modelGuid,sellingPrice,warranty)
       VALUES (?,?,?,?,?,?)`,
      [newItemGuid, orderGuid, newSerialId, serRows[0].modelGuid, sellingPrice || 0, warranty || null]
    );
    await conn.query("UPDATE serials SET status='Dispatched' WHERE guid=?", [newSerialId]);
    await conn.commit();
  } catch (txErr) {
    await conn.rollback();
    throw txErr;
  } finally {
    conn.release();
  }

  await recordSerialMovement(mysqlPool, {
    serialNumberGuid: newSerialId,
    serialValue: serRows[0].value,
    dispatchGuid: newItemGuid,
    actionType: "Dispatched",
    status: "Dispatched",
    reason: "Added to existing order",
    firmName: order.platform,
    customerName: order.customerName || "",
    createdBy: addedBy || "System",
  });

  const [newRow] = await mysqlPool.query(ORDER_SELECT + " WHERE oi.guid=?", [newItemGuid]);
  return NextResponse.json({ message: "Serial added to order", item: mapDispatchRow(newRow[0]) }, { status: 201 });
});
