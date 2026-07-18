import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, requireCompany, ApiError } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  requireCompany(user);
  authorizeOrdersRequest(user, "PUT", new URL(request.url).pathname, null);

  const { items, removeInvoice, removeEwayBill } = await parseJsonBody(request);
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, "No items provided");

  const notified = new Set();
  for (const item of items) {
    const { id: orderGuid, cancelReason: remarks = "" } = item;
    const [oRows] = await mysqlPool.query("SELECT orderid, dispatchedBy FROM orders WHERE guid=? AND companyGuid=?", [orderGuid, user.companyId]);
    const orderId = oRows[0]?.orderid || "Unknown Order";
    const dispatchedBy = oRows[0]?.dispatchedBy || null;

    await mysqlPool.query("UPDATE orders SET status=?, remarks=?, freightCharges=0 WHERE guid=? AND companyGuid=?", ["Send for Billing", remarks, orderGuid, user.companyId]);
    await mysqlPool.query("UPDATE order_logistics SET logisticsStatus=NULL, trackingId=NULL, courierPartner=NULL WHERE orderGuid=? AND companyGuid=?", [orderGuid, user.companyId]);

    if (!notified.has(orderId)) {
      notified.add(orderId);
      let creatorGuid = null;
      if (dispatchedBy) {
        const [cr] = await mysqlPool.query("SELECT userid FROM users WHERE username=?", [dispatchedBy]);
        if (cr.length) creatorGuid = String(cr[0].userid);
      }
      await createNotification(mysqlPool, { targetRole: "Admin", title: "Order Sent Back to Billing", message: `Order ${orderId} sent back to billing. Reason: ${remarks}`, type: "warning", link: "/billing", companyGuid: user.companyId });
      await createNotification(mysqlPool, { targetRole: "Accountant", title: "Order Sent Back to Billing", message: `Order ${orderId} sent back by Dispatch. Reason: ${remarks}`, type: "warning", link: "/billing", companyGuid: user.companyId });
      if (creatorGuid) await createNotification(mysqlPool, { targetUserGuid: creatorGuid, title: "Order Sent Back to Billing", message: `Order ${orderId} has been sent back to billing. Reason: ${remarks}`, type: "warning", link: "/billing", companyGuid: user.companyId });
    }

    if (removeInvoice || removeEwayBill) {
      const clauses = [];
      if (removeInvoice) clauses.push("invoiceNumber=NULL", "invoiceFilename=NULL");
      if (removeEwayBill) clauses.push("ewayBillNumber=NULL", "ewayBillFilename=NULL");
      if (clauses.length) await mysqlPool.query(`UPDATE orders SET ${clauses.join(",")} WHERE guid=? AND companyGuid=?`, [orderGuid, user.companyId]);
    }
  }
  return NextResponse.json({ message: "Orders sent back to billing successfully" });
});
