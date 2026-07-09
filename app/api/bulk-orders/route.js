import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, body);
  requireAuth(user);

  const { customerName, firmName, totalAmount, serialIds, invoice, dispatch } = body;
  const conn = await mysqlPool.getConnection();
  let orderGuid;
  try {
    await conn.beginTransaction();
    orderGuid = randomUUID();
    await conn.query(
      "INSERT INTO bulkorders (guid,orderid,platform,totalAmount,createdBy,status) VALUES (?,?,?,?,?,'Pending')",
      [orderGuid, customerName, firmName, totalAmount || 0, user?.username || "System"]
    );
    for (const sId of serialIds) {
      await conn.query("INSERT INTO bulkorderitems (orderGuid,serialNumberGuid,itemStatus) VALUES (?,?,'Active')", [orderGuid, sId]);
      await conn.query("UPDATE serials SET status='Dispatched' WHERE guid=?", [sId]);
    }
    if (invoice?.invoiceNumber) await conn.query("INSERT INTO bulkorderinvoices (orderGuid,invoiceNumber,ewayBillNumber) VALUES (?,?,?)", [orderGuid, invoice.invoiceNumber, invoice.ewayBillNumber || null]);
    if (dispatch?.trackingId) await conn.query("INSERT INTO bulkorderdispatches (orderGuid,trackingId,courierPartner,logisticsStatus) VALUES (?,?,?,'Dispatched')", [orderGuid, dispatch.trackingId, dispatch.courierPartner || null]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return NextResponse.json({ message: "Bulk order created successfully", orderId: orderGuid }, { status: 201 });
});
