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
    SELECT oi.guid, o.dispatchDate, o.platform AS firmName, o.orderid as customer,
           m.name as modelName, s.value as serialNumber,
           ins.installationStatus, ins.installationCharges, ins.installationRemarks,
           ins.scheduledDate, ins.installationDate, ins.technicianName, ins.technicianContact
    FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid
    LEFT JOIN order_installations ins ON o.guid=ins.orderGuid
    LEFT JOIN serials s ON oi.serialNumberGuid=s.guid LEFT JOIN models m ON s.modelGuid=m.guid
    WHERE (ins.installationRequired='Yes' OR ins.installationRequired='true' OR ins.installationRequired='1') AND o.isDeleted=0
  `;
  const sqlParams = [];
  if (startDate && endDate) { q += " AND o.dispatchDate>=? AND o.dispatchDate<=?"; sqlParams.push(`${startDate.split("T")[0]} 00:00:00`, `${endDate.split("T")[0]} 23:59:59`); }
  q += " ORDER BY o.dispatchDate DESC";
  const [installations] = await mysqlPool.query(q, sqlParams);

  const summary = { total: installations.length };
  for (const s of ["Pending", "Scheduled", "In Progress", "Completed", "Cancelled"]) {
    summary[s.replace(" ", "")] = installations.filter((i) => i.installationStatus === s).length;
  }
  summary.totalCharges = installations.reduce((s, i) => s + (Number(i.installationCharges) || 0), 0);
  return NextResponse.json({ summary, installations });
});
