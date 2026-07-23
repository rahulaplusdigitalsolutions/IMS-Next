import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request, { params }) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, body);
  requireAuth(user);
  const { id } = await params;

  const { replacements, invoice, dispatch, reason } = body;
  const [orderCheck] = await mysqlPool.query("SELECT guid FROM bulkorders WHERE guid=?", [id]);
  if (!orderCheck.length) throw new ApiError(404, "Bulk order not found");
  if (!Array.isArray(replacements) || !replacements.length) throw new ApiError(400, "No replacements provided");

  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();
    for (const rep of replacements) {
      const [activeItem] = await conn.query(
        "SELECT guid FROM bulkorderitems WHERE orderGuid=? AND serialNumberGuid=? AND itemStatus='Active'",
        [id, rep.oldSerialId]
      );
      if (!activeItem.length) throw new Error(`Serial ${rep.oldSerialId} is not an active item on this order`);
      await conn.query("UPDATE inventorystockinserial SET serialStatus='Available' WHERE guid=?", [rep.oldSerialId]);
      await conn.query("UPDATE inventorystockinserial SET serialStatus='Dispatched' WHERE guid=?", [rep.newSerialId]);
      await conn.query("UPDATE bulkorderitems SET itemStatus='Replaced' WHERE orderGuid=? AND serialNumberGuid=? AND itemStatus='Active'", [id, rep.oldSerialId]);
      await conn.query("INSERT INTO bulkorderitems (orderGuid,serialNumberGuid,itemStatus) VALUES (?,?,'Active')", [id, rep.newSerialId]);
      await conn.query("INSERT INTO replacementhistory (orderGuid,oldSerialId,newSerialId,reason,replacedBy) VALUES (?,?,?,?,?)", [id, rep.oldSerialId, rep.newSerialId, reason || "Replaced", user?.username || "System"]);
    }
    if (invoice?.invoiceNumber) await conn.query("INSERT INTO bulkorderinvoices (orderGuid,invoiceNumber,ewayBillNumber) VALUES (?,?,?)", [id, invoice.invoiceNumber, invoice.ewayBillNumber || null]);
    if (dispatch?.trackingId) await conn.query("INSERT INTO bulkorderdispatches (orderGuid,trackingId,courierPartner,logisticsStatus) VALUES (?,?,?,'Dispatched')", [id, dispatch.trackingId, dispatch.courierPartner || null]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return NextResponse.json({ message: "Replacement processed successfully" });
});
