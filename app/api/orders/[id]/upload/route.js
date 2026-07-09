import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, canManageOrderDocuments, ApiError } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload";
import { withErrorHandling } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "POST", new URL(request.url).pathname, null);
  requireAuth(user);
  const { id } = await params;

  const formData = await request.formData();
  const file = formData.get("file");
  const docType = formData.get("docType");
  if (!file || typeof file.arrayBuffer !== "function") throw new ApiError(400, "No file uploaded");

  const role = user?.role;
  if (!canManageOrderDocuments(role, docType)) {
    throw new ApiError(403, "You cannot upload this document type.");
  }

  const saved = await saveUploadedFile(file);
  const filename = saved.filename;

  if (id !== "0") {
    const [itemRows] = await mysqlPool.query("SELECT orderGuid FROM order_items WHERE guid=?", [id]);
    if (!itemRows.length) throw new ApiError(404, "Order not found");
    const orderId = itemRows[0].orderGuid;
    if (docType === "gemContract") {
      await mysqlPool.query("UPDATE order_items SET contractFilename=? WHERE guid=?", [filename, id]);
    } else if (docType === "pod") {
      await mysqlPool.query("UPDATE order_logistics SET podFilename=? WHERE orderGuid=?", [filename, orderId]);
    } else if (docType === "ewayBill") {
      await mysqlPool.query("UPDATE orders SET ewayBillFilename=? WHERE guid=?", [filename, orderId]);
    } else if (docType === "invoice") {
      await mysqlPool.query("UPDATE orders SET invoiceFilename=? WHERE guid=?", [filename, orderId]);
    }
    await mysqlPool.query("INSERT INTO orderdocuments (guid, dispatchGuid, docType, filename) VALUES (UUID(),?,?,?)", [id, docType, filename]);
  }

  return NextResponse.json({ message: "File uploaded successfully", filename, url: `${process.env.BACKEND_URI}/uploads/${filename}` });
});
