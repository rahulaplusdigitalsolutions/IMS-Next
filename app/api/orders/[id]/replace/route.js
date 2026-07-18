import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireCompany, ApiError } from "@/lib/auth";
import { recordSerialMovement } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

const handleReplace = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeOrdersRequest(user, request.method, new URL(request.url).pathname, null);
  const { id } = await params;

  const body = await parseJsonBody(request);
  const targetSerialId = body.newSerialId || body.serialId;
  const reason = body.reason || body.remarks || "Replaced by user";
  const condition = body.condition || "Available";

  const [dispRows] = await mysqlPool.query(
    "SELECT oi.guid, oi.serialNumberGuid, oi.orderGuid, o.platform as firmName, o.customerName as customer FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid AND o.companyGuid=oi.companyGuid WHERE oi.guid=? AND oi.companyGuid=?",
    [id, user.companyId]
  );
  if (!dispRows.length) throw new ApiError(404, "Order not found");
  const dispatch = dispRows[0];

  const [newSer] = await mysqlPool.query("SELECT * FROM serials WHERE guid=? AND isDeleted=0 AND companyGuid=?", [targetSerialId, user.companyId]);
  if (!newSer.length) throw new ApiError(404, "New serial not found");
  if (newSer[0].status !== "Available") throw new ApiError(400, "New serial is not Available");

  const [oldSer] = await mysqlPool.query("SELECT value FROM serials WHERE guid=? AND companyGuid=?", [dispatch.serialNumberGuid, user.companyId]);
  const oldValue = oldSer[0]?.value || "Unknown";

  await mysqlPool.query("UPDATE serials SET status=? WHERE guid=? AND companyGuid=?", [condition === "Damaged" ? "Damaged" : "Available", dispatch.serialNumberGuid, user.companyId]);
  await mysqlPool.query("UPDATE serials SET status='Dispatched' WHERE guid=? AND companyGuid=?", [targetSerialId, user.companyId]);
  await mysqlPool.query("UPDATE order_items SET serialNumberGuid=?,remarks=? WHERE guid=? AND companyGuid=?", [targetSerialId, reason, id, user.companyId]);

  const isMarketplace = dispatch.firmName === "Amazon" || dispatch.firmName === "Flipkart";
  await mysqlPool.query("UPDATE orders SET status=?,isDeleted=0 WHERE guid=? AND companyGuid=?", [isMarketplace ? "Ready for Pickup" : "Send for Billing", dispatch.orderGuid, user.companyId]);
  await mysqlPool.query("UPDATE order_logistics SET logisticsStatus=? WHERE orderGuid=? AND companyGuid=?", [isMarketplace ? "Ready for Pickup" : null, dispatch.orderGuid, user.companyId]);

  await recordSerialMovement(mysqlPool, { companyGuid: user.companyId, serialNumberGuid: dispatch.serialNumberGuid, serialValue: oldValue, dispatchGuid: id, actionType: "ReplacedOut", status: condition === "Damaged" ? "Damaged" : "Available", condition: condition !== "Available" ? condition : null, reason, firmName: dispatch.firmName, customerName: dispatch.customer || "", createdBy: body.replacedBy || "System" });
  await recordSerialMovement(mysqlPool, { companyGuid: user.companyId, serialNumberGuid: targetSerialId, serialValue: newSer[0].value, dispatchGuid: id, actionType: "ReplacedIn", status: "Dispatched", reason, firmName: dispatch.firmName, customerName: dispatch.customer || "", createdBy: body.replacedBy || "System" });

  return NextResponse.json({ message: "Order replaced successfully", newSerialValue: newSer[0].value });
});

export const POST = handleReplace;
export const PUT = handleReplace;
