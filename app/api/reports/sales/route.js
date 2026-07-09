import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeReports } from "@/lib/reportsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeReports(user, "GET");

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let q = `
    SELECT o.dispatchDate, o.platform AS firmName, o.orderid as customer,
           oi.sellingPrice, s.landingPrice, m.name as modelName, m.company as companyName,
           s.value as serialNumber, ins.installationRequired, ins.installationCharges,
           o.packagingCost, o.commission, o.status
    FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid
    LEFT JOIN order_installations ins ON o.guid=ins.orderGuid
    LEFT JOIN serials s ON oi.serialNumberGuid=s.guid LEFT JOIN models m ON s.modelGuid=m.guid
    WHERE o.isDeleted=0
  `;
  const sqlParams = [];
  if (startDate && endDate) { q += " AND o.dispatchDate>=? AND o.dispatchDate<=?"; sqlParams.push(`${startDate.split("T")[0]} 00:00:00`, `${endDate.split("T")[0]} 23:59:59`); }
  q += " ORDER BY o.dispatchDate DESC";
  const [sales] = await mysqlPool.query(q, sqlParams);

  const isInstall = (i) => i.installationRequired === 1 || i.installationRequired === "Yes" || i.installationRequired === true || i.installationRequired === "true";
  const summary = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((s, r) => s + (Number(r.sellingPrice) || 0), 0),
    totalCost: sales.reduce((s, r) => s + (Number(r.landingPrice) || 0) + (Number(r.packagingCost) || 0) + (Number(r.commission) || 0), 0),
    totalProfit: sales.reduce((s, r) => s + ((Number(r.sellingPrice) || 0) - (Number(r.landingPrice) || 0) - (Number(r.packagingCost) || 0) - (Number(r.commission) || 0)), 0),
    totalInstallationCharges: sales.reduce((s, r) => (isInstall(r) ? s + (Number(r.installationCharges) || 0) : s), 0),
  };
  return NextResponse.json({ summary, sales });
});
