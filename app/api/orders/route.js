import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest } from "@/lib/auth";
import { mapDispatchRow } from "@/lib/helpers";
import { ORDER_SELECT } from "@/lib/ordersQuery";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "GET", new URL(request.url).pathname, null);

  const [orders] = await mysqlPool.query(ORDER_SELECT + " ORDER BY o.dispatchDate DESC");
  const [docs] = await mysqlPool.query("SELECT dispatchGuid as dispatchId, docType, filename, createdAt FROM orderdocuments ORDER BY createdAt ASC");
  const docsMap = {};
  docs.forEach((d) => { if (!docsMap[d.dispatchId]) docsMap[d.dispatchId] = []; docsMap[d.dispatchId].push(d); });
  return NextResponse.json(orders.map((o) => ({ ...mapDispatchRow(o), documents: docsMap[o.id] || [] })));
});
