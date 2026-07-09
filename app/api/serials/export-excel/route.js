import { NextResponse } from "next/server";
import xlsx from "xlsx";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeSerials(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT s.guid as id, s.modelGuid as modelId,
           COALESCE(m.name, CONCAT(i.itemName, ' (', itv.variantName, ')'), 'Unknown Item') as modelName,
           COALESCE(m.company, b.brandName, '') as company,
           s.value as serialNumber, s.godownGuid, g.godownName, s.landingPrice,
           COALESCE(m.mrp, 0) as mrp,
           s.status, s.landingPriceReason, s.createdAt
    FROM serials s
    LEFT JOIN models m ON s.modelGuid=m.guid AND m.isDeleted=0
    LEFT JOIN inventoryitemvariant itv ON s.modelGuid=itv.itemVariantId AND itv.isDeleted=0
    LEFT JOIN inventoryitemmaster i ON itv.itemId=i.itemId AND i.isDeleted=0
    LEFT JOIN inventorybrandmaster b ON i.brandId=b.brandId AND b.isDeleted=0
    LEFT JOIN godowns g ON s.godownGuid=g.guid AND g.isDeleted=0
    WHERE s.isDeleted=0
  `);
  const data = rows.map((r) => ({
    ID: r.id, "Model ID": r.modelId, "Model Name": r.modelName, Company: r.company,
    "Serial Number": r.serialNumber, Godown: r.godownName || "", "Godown GUID": r.godownGuid || "",
    "Landing Price": r.landingPrice, MRP: r.mrp, Status: r.status,
    "Price Reason": r.landingPriceReason || "",
    "Created At": r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "",
  }));
  const ws = xlsx.utils.json_to_sheet(data);
  ws["!cols"] = [8, 38, 25, 15, 25, 25, 38, 15, 12, 12, 25, 20].map((w) => ({ wch: w }));
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Serials");

  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=serials_export_${Date.now()}.xlsx`,
    },
  });
});
