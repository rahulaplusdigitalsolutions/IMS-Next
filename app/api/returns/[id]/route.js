import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeReturns } from "@/lib/returnsAuth";
import { recordSerialMovement } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeReturns(user, "PUT");
  const { id } = await params;

  const { condition, repairCost, reason } = await parseJsonBody(request);
  const [existing] = await mysqlPool.query(`
    SELECT r.guid, r.serialNumberGuid, s.value as serialValue, r.condition, r.reason,
           r.platform AS firmName, r.orderid AS customerName, r.invoiceNumber, r.dispatchGuid
    FROM returns r LEFT JOIN serials s ON s.guid=r.serialNumberGuid WHERE r.guid=?
  `, [id]);
  if (!existing.length) throw new ApiError(404, "Return not found");
  const ext = existing[0];

  const setClauses = [], sqlParams = [];
  if (condition !== undefined) { setClauses.push("`condition`=?"); sqlParams.push(condition); }
  if (repairCost !== undefined) { setClauses.push("repairCost=?"); sqlParams.push(repairCost); }
  if (reason !== undefined) { setClauses.push("reason=?"); sqlParams.push(reason); }

  if (setClauses.length) { sqlParams.push(id); await mysqlPool.query(`UPDATE returns SET ${setClauses.join(",")} WHERE guid=?`, sqlParams); }

  if (condition !== undefined) {
    const newStatus = ["Repaired", "Good", "InStock"].includes(condition) ? "Available" : "Damaged";
    await mysqlPool.query("UPDATE serials SET status=? WHERE guid=?", [newStatus, ext.serialNumberGuid]);
    await recordSerialMovement(mysqlPool, { serialNumberGuid: ext.serialNumberGuid, serialValue: ext.serialValue, dispatchGuid: ext.dispatchGuid, actionType: newStatus === "Available" ? "InStock" : "Damaged", status: newStatus, condition, reason: reason !== undefined ? reason : ext.reason, firmName: ext.firmName, customerName: ext.customerName, invoiceNumber: ext.invoiceNumber, createdBy: "System", notes: `Inventory status updated from return #${id}` });
  }

  return NextResponse.json({ message: "Return updated successfully" });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeReturns(user, "DELETE");
  const { id } = await params;

  const [check] = await mysqlPool.query(`
    SELECT r.guid, r.serialNumberGuid, COALESCE(NULLIF(r.serialValue,''),s.value,'') as serialValue,
           r.condition, r.reason, r.platform AS firmName, r.orderid AS customerName, r.invoiceNumber, r.dispatchGuid
    FROM returns r LEFT JOIN serials s ON s.guid=r.serialNumberGuid WHERE r.guid=? LIMIT 1
  `, [id]);
  if (!check.length) throw new ApiError(404, "Return not found");
  const rec = check[0];

  await mysqlPool.query("UPDATE returns SET isDeleted=1 WHERE guid=?", [id]);
  const [cnt] = await mysqlPool.query("SELECT COUNT(*) as total FROM returns WHERE serialNumberGuid=? AND isDeleted=0", [rec.serialNumberGuid]);
  await mysqlPool.query("UPDATE serials SET status='Dispatched', returnCount=? WHERE guid=?", [cnt[0].total, rec.serialNumberGuid]);

  if (rec.dispatchGuid) {
    const [item] = await mysqlPool.query("SELECT orderGuid FROM order_items WHERE guid=?", [rec.dispatchGuid]);
    if (item.length) {
      const og = item[0].orderGuid;
      const [tot] = await mysqlPool.query("SELECT COUNT(*) as total FROM order_items WHERE orderGuid=?", [og]);
      const [ret] = await mysqlPool.query("SELECT COUNT(DISTINCT serialNumberGuid) as total FROM returns WHERE dispatchGuid IN (SELECT guid FROM order_items WHERE orderGuid=?) AND isDeleted=0", [og]);
      const ns = ret[0].total === 0 ? "Delivered" : ret[0].total >= tot[0].total ? "Returned" : "Partially Returned";
      await mysqlPool.query("UPDATE orders SET status=? WHERE guid=?", [ns, og]);
    }
  }

  await recordSerialMovement(mysqlPool, { serialNumberGuid: rec.serialNumberGuid, serialValue: rec.serialValue, dispatchGuid: rec.dispatchGuid, actionType: "ReturnDeleted", status: "Dispatched", condition: rec.condition, reason: rec.reason, firmName: rec.firmName, customerName: rec.customerName, invoiceNumber: rec.invoiceNumber, createdBy: "System", notes: `Return #${id} was deleted and order context restored` });

  return NextResponse.json({ message: "Return record deleted successfully" });
});
