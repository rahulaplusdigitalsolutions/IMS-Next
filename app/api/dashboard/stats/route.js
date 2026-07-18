import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, ALL_AUTHENTICATED_ROLES, requireCompany, resolveScopedCompanyGuid } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeReadWrite(user, "GET", { readRoles: ALL_AUTHENTICATED_ROLES, writeRoles: [], denyMessage: "You do not have access to dashboard data." });

  // cid === null means the caller is authorized to see every company combined
  // (Dashboard's "All Companies" filter) — every clause below becomes a no-op.
  const cid = resolveScopedCompanyGuid(user, request);
  const w = (alias) => (cid ? `AND ${alias}.companyGuid=?` : "");
  const p = (n) => (cid ? Array(n).fill(cid) : []);

  const [[{ totalModels }]] = await mysqlPool.query(`SELECT COUNT(*) as totalModels FROM models WHERE isDeleted=0 ${w("models")}`, p(1));
  const [[{ totalSerials }]] = await mysqlPool.query(`SELECT COUNT(*) as totalSerials FROM serials WHERE isDeleted=0 ${w("serials")}`, p(1));
  const [[{ availableSerials }]] = await mysqlPool.query(`SELECT COUNT(*) as availableSerials FROM serials WHERE status='Available' AND isDeleted=0 ${w("serials")}`, p(1));
  const [[{ dispatchedSerials }]] = await mysqlPool.query(`SELECT COUNT(*) as dispatchedSerials FROM serials WHERE status='Dispatched' AND isDeleted=0 ${w("serials")}`, p(1));
  const [[{ totalDispatches }]] = await mysqlPool.query(`SELECT COUNT(oi.guid) as totalDispatches FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid WHERE o.isDeleted=0 ${w("o")} ${w("oi")}`, p(2));
  const [[{ recentDispatches }]] = await mysqlPool.query(`SELECT COUNT(oi.guid) as recentDispatches FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid WHERE o.dispatchDate>=DATE_SUB(NOW(),INTERVAL 30 DAY) AND o.isDeleted=0 ${w("o")} ${w("oi")}`, p(2));
  const [[{ totalReturns }]] = await mysqlPool.query(`SELECT COUNT(*) as totalReturns FROM returns WHERE isDeleted=0 ${w("returns")}`, p(1));
  const [[{ pendingInstallations }]] = await mysqlPool.query(`SELECT COUNT(oi.guid) as pendingInstallations FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid JOIN order_installations ins ON o.guid=ins.orderGuid WHERE (ins.installationRequired='Yes' OR ins.installationRequired='true' OR ins.installationRequired='1') AND ins.installationStatus IN ('Pending','Scheduled') AND o.isDeleted=0 ${w("o")} ${w("oi")} ${w("ins")}`, p(3));
  const [[{ totalRevenue }]] = await mysqlPool.query(`SELECT SUM(oi.sellingPrice) as totalRevenue FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid WHERE o.dispatchDate>=DATE_SUB(NOW(),INTERVAL 30 DAY) AND o.isDeleted=0 ${w("o")} ${w("oi")}`, p(2));

  return NextResponse.json({ totalModels, totalSerials, availableSerials, dispatchedSerials, totalDispatches, recentDispatches, totalReturns, pendingInstallations, totalRevenue: Number(totalRevenue || 0) });
});
