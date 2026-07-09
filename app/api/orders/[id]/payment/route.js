import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { safeDate } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "PUT", new URL(request.url).pathname, null);
  requireAuth(user);
  const { id } = await params;

  const { paymentDate, amount, utrId, status, paymentType, settlementDeduction } = await parseJsonBody(request);
  const numAmount = Number(amount);
  const numDeduction = Number(settlementDeduction || 0);
  if (!Number.isFinite(numAmount) || numAmount < 0) throw new ApiError(400, "Invalid payment amount.");
  if (!Number.isFinite(numDeduction) || numDeduction < 0) throw new ApiError(400, "Invalid settlement deduction amount.");

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();
    try {
      const [existing] = await conn.query("SELECT guid FROM payments WHERE dispatchGuid=?", [id]);
      if (existing.length) {
        await conn.query("UPDATE payments SET paymentDate=?,amount=?,utrId=?,paymentType=?,settlementDeduction=? WHERE dispatchGuid=?", [safeDate(paymentDate), numAmount, utrId, paymentType || "Full", numDeduction, id]);
      } else {
        await conn.query("INSERT INTO payments (guid,dispatchGuid,paymentDate,amount,utrId,paymentType,settlementDeduction) VALUES (UUID(),?,?,?,?,?,?)", [id, safeDate(paymentDate), numAmount, utrId, paymentType || "Full", numDeduction]);
      }
      const [itemRows] = await conn.query("SELECT orderGuid FROM order_items WHERE guid=?", [id]);
      if (itemRows.length) {
        await conn.query("UPDATE orders SET status=? WHERE guid=?", [status || "Completed", itemRows[0].orderGuid]);
        await conn.query("UPDATE order_logistics SET logisticsStatus=CASE WHEN logisticsStatus!='Delivered' THEN 'Delivered' ELSE logisticsStatus END WHERE orderGuid=?", [itemRows[0].orderGuid]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } finally {
    conn.release();
  }
  return NextResponse.json({ message: "Payment recorded and order completed." });
});
