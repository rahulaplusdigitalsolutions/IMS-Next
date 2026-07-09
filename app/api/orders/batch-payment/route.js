import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { safeDate } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, null);
  requireAuth(user);

  const { itemIds, paymentDate, totalAmount, utrId, status, paymentType, settlementDeduction } = await parseJsonBody(request);
  if (!Array.isArray(itemIds) || !itemIds.length) throw new ApiError(400, "No items provided.");
  const numTotal = Number(totalAmount);
  const numDeduction = Number(settlementDeduction || 0);
  if (!Number.isFinite(numTotal) || numTotal < 0) throw new ApiError(400, "Invalid total amount.");
  if (!Number.isFinite(numDeduction) || numDeduction < 0) throw new ApiError(400, "Invalid settlement deduction amount.");

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();
    try {
      const amtPer = (numTotal / itemIds.length).toFixed(2);
      const dedPer = (numDeduction / itemIds.length).toFixed(2);
      for (const id of itemIds) {
        const [ex] = await conn.query("SELECT guid FROM payments WHERE dispatchGuid=?", [id]);
        if (ex.length) {
          await conn.query("UPDATE payments SET paymentDate=?,amount=?,utrId=?,paymentType=?,settlementDeduction=? WHERE dispatchGuid=?", [safeDate(paymentDate), amtPer, utrId, paymentType || "Full", dedPer, id]);
        } else {
          await conn.query("INSERT INTO payments (guid,dispatchGuid,paymentDate,amount,utrId,paymentType,settlementDeduction) VALUES (UUID(),?,?,?,?,?,?)", [id, safeDate(paymentDate), amtPer, utrId, paymentType || "Full", dedPer]);
        }
        const [ir] = await conn.query("SELECT orderGuid FROM order_items WHERE guid=?", [id]);
        if (ir.length) {
          await conn.query("UPDATE orders SET status=? WHERE guid=?", [status || "Completed", ir[0].orderGuid]);
          await conn.query("UPDATE order_logistics SET logisticsStatus=CASE WHEN logisticsStatus!='Delivered' THEN 'Delivered' ELSE logisticsStatus END WHERE orderGuid=?", [ir[0].orderGuid]);
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } finally {
    conn.release();
  }
  return NextResponse.json({ message: "Batch payment recorded successfully" });
});
