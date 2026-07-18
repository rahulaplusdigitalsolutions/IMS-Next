import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireCompany, ApiError } from "@/lib/auth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

// Lets billing details (invoice no./date, e-way bill no.) be prepped ahead of
// time on a Draft order — deliberately a plain UPDATE on `orders` (guarded to
// status='Draft') rather than going through the dispatch stored-procedure
// update path, since that path assumes a real assigned serial which Draft
// order_items don't have yet.
export const PATCH = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  const { orderId } = await params;
  authorizeOrdersRequest(user, "PATCH", new URL(request.url).pathname, null);

  const body = await parseJsonBody(request);
  const { invoiceNumber, invoiceDate, ewayBillNumber, gemBillUploaded, invoiceFilename, ewayBillFilename } = body;

  const [result] = await mysqlPool.query(
    `UPDATE orders
       SET invoiceNumber = ?, invoiceDate = ?, ewayBillNumber = ?, gemBillUploaded = ?,
           invoiceFilename = ?, ewayBillFilename = ?
     WHERE guid = ? AND companyGuid = ? AND status = 'Draft'`,
    [
      invoiceNumber || null,
      invoiceDate || null,
      ewayBillNumber || null,
      gemBillUploaded || "No",
      invoiceFilename || null,
      ewayBillFilename || null,
      orderId,
      user.companyId,
    ]
  );

  if (result.affectedRows === 0) {
    throw new ApiError(404, "Draft order not found.");
  }

  return NextResponse.json({ message: "Draft billing details saved." });
});
