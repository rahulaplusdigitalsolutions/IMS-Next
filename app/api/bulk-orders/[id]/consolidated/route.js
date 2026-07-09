import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "GET", new URL(request.url).pathname, null);
  requireAuth(user);
  const { id } = await params;

  const [[order]] = await mysqlPool.query("SELECT *, orderid as customerName, platform as firmName FROM bulkorders WHERE guid=?", [id]);
  const [serials] = await mysqlPool.query("SELECT boi.*, s.value as serialValue, m.name as modelName FROM bulkorderitems boi JOIN serials s ON boi.serialNumberGuid=s.guid JOIN models m ON s.modelGuid=m.guid WHERE boi.orderGuid=? ORDER BY boi.addedAt ASC", [id]);
  const [replacements] = await mysqlPool.query("SELECT r.*, oldS.value as oldSerial, newS.value as newSerial FROM replacementhistory r JOIN serials oldS ON r.oldSerialId=oldS.guid JOIN serials newS ON r.newSerialId=newS.guid WHERE r.orderGuid=? ORDER BY r.createdAt ASC", [id]);
  const [invoices] = await mysqlPool.query("SELECT * FROM bulkorderinvoices WHERE orderGuid=? ORDER BY createdAt ASC", [id]);
  const [dispatches] = await mysqlPool.query("SELECT * FROM bulkorderdispatches WHERE orderGuid=? ORDER BY dispatchDate ASC", [id]);
  const [payments] = await mysqlPool.query("SELECT * FROM bulkorderpayments WHERE orderGuid=? ORDER BY createdAt ASC", [id]);
  return NextResponse.json({ order, serials, replacements, invoices, dispatches, payments });
});
