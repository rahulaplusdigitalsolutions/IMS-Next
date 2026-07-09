import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, ApiError } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const body = await parseJsonBody(request);
  const user = await authenticateRequest(request);
  authorizeInventory(user, "POST");
  requireAuth(user);

  const {
    StockInId, StockInDetailId, VendorId, InvoiceNo, InvoiceDate,
    ItemVariantId, modelGuid, godownGuid, UnitId, Barcode, StockInQty,
    DefaultPcsQty, FinalPcsQty, PurchaseRate,
    Remarks, InvoiceFile,
  } = body;

  if (!StockInId) throw new ApiError(400, "StockInId is required");
  if (!ItemVariantId && !modelGuid) throw new ApiError(400, "ItemVariantId or modelGuid is required");

  const connection = await mysqlPool.getConnection();
  let currentDetailId;
  try {
    await connection.beginTransaction();

    const sanitizedInvoiceDate = InvoiceDate && InvoiceDate.trim() !== "" ? InvoiceDate : null;
    const sanitizedVendorId = VendorId && VendorId.trim() !== "" ? VendorId : null;

    await connection.execute(
      "INSERT IGNORE INTO inventorystockin (stockInId, vendorId, invoiceNo, invoiceDate, remarks, invoiceFile, status) VALUES (?, ?, ?, ?, ?, ?, 0)",
      [StockInId, sanitizedVendorId, InvoiceNo || null, sanitizedInvoiceDate, Remarks || null, InvoiceFile || null]
    );
    await connection.execute(
      "UPDATE inventorystockin SET vendorId = ?, invoiceNo = ?, invoiceDate = ?, remarks = ?, invoiceFile = ? WHERE stockInId = ? AND status = 0",
      [sanitizedVendorId, InvoiceNo || null, sanitizedInvoiceDate, Remarks || null, InvoiceFile || null, StockInId]
    );

    currentDetailId = StockInDetailId;
    if (currentDetailId && currentDetailId !== "null") {
      await connection.execute(
        "UPDATE inventorystockindetail SET itemVariantId = ?, modelGuid = ?, godownGuid = ?, unitId = ?, barcode = ?, stockInQty = ?, defaultPcsQty = ?, finalPcsQty = ?, purchaseRate = ? WHERE stockInDetailId = ?",
        [ItemVariantId || null, modelGuid || null, godownGuid || null, UnitId || null, Barcode || null, StockInQty || 0, DefaultPcsQty || 1, FinalPcsQty || 0, PurchaseRate || 0, currentDetailId]
      );
    } else {
      const [dup] = await connection.query(
        "SELECT stockInDetailId FROM inventorystockindetail WHERE stockInId = ? AND (itemVariantId = ? OR modelGuid = ?) AND unitId <=> ? AND isDeleted = 0 LIMIT 1",
        [StockInId, ItemVariantId || "N/A", modelGuid || "N/A", UnitId || null]
      );

      if (dup.length > 0) {
        currentDetailId = dup[0].stockInDetailId;
        await connection.execute(
          "UPDATE inventorystockindetail SET barcode = ?, godownGuid = COALESCE(?, godownGuid), stockInQty = ?, defaultPcsQty = ?, finalPcsQty = ?, purchaseRate = ? WHERE stockInDetailId = ?",
          [Barcode || null, godownGuid || null, StockInQty || 0, DefaultPcsQty || 1, FinalPcsQty || 0, PurchaseRate || 0, currentDetailId]
        );
      } else {
        currentDetailId = uuidv4();
        await connection.execute(
          "INSERT INTO inventorystockindetail (stockInDetailId, stockInId, itemVariantId, modelGuid, godownGuid, unitId, barcode, stockInQty, defaultPcsQty, finalPcsQty, purchaseRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [currentDetailId, StockInId, ItemVariantId || null, modelGuid || null, godownGuid || null, UnitId || null, Barcode || null, StockInQty || 0, DefaultPcsQty || 1, FinalPcsQty || 0, PurchaseRate || 0]
        );
      }
    }

    const [totals] = await connection.query(
      "SELECT SUM(stockInQty) as totalQty, SUM(stockInQty * purchaseRate) as totalAmount FROM inventorystockindetail WHERE stockInId = ? AND isDeleted = 0",
      [StockInId]
    );
    await connection.execute("UPDATE inventorystockin SET totalAmount = ? WHERE stockInId = ?", [totals[0].totalAmount || 0, StockInId]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("Error in SaveStockInDraft transaction:", err);
    throw err;
  } finally {
    connection.release();
  }
  return NextResponse.json({ message: "Success", data: { stockInDetailId: currentDetailId } });
});
