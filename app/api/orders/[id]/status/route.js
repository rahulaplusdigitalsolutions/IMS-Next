import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "PUT", new URL(request.url).pathname, null);
  const { id } = await params;

  const { status, trackingId, reason, cancelledBy, clearLogistics } = await parseJsonBody(request);
  const [cur] = await mysqlPool.query("SELECT oi.serialNumberGuid, oi.orderGuid FROM order_items oi WHERE oi.guid=?", [id]);
  if (!cur.length) throw new ApiError(404, "Order not found");
  const { serialNumberGuid, orderGuid } = cur[0];

  if (status === "Order Cancelled") {
    await mysqlPool.query("UPDATE inventorystockinserial SET serialStatus='Available' WHERE guid=?", [serialNumberGuid]);
    await mysqlPool.query("UPDATE orders SET status=?,isDeleted=1,cancellationReason=?,cancelledBy=?,cancelledAt=NOW() WHERE guid=?", [status, reason || "No reason", cancelledBy || "Unknown", orderGuid]);
  } else {
    await mysqlPool.query("UPDATE orders SET status=? WHERE guid=? AND isDeleted=0", [status, orderGuid]);
  }
  if (clearLogistics) {
    await mysqlPool.query("UPDATE order_logistics SET logisticsStatus=NULL, trackingId=NULL WHERE orderGuid=?", [orderGuid]);
  } else {
    await mysqlPool.query("UPDATE order_logistics SET trackingId=? WHERE orderGuid=?", [trackingId || null, orderGuid]);
  }
  return NextResponse.json({ message: "Status updated successfully" });
});
