import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireCompany, resolveScopedCompanyGuid } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeSerials(user, "GET");

  const companyGuid = resolveScopedCompanyGuid(user, request);
  const c = (alias) => (companyGuid ? `AND ${alias}.companyGuid = ?` : "");
  const params = companyGuid ? Array(5).fill(companyGuid) : [];

  const [rows] = await mysqlPool.query(`
    SELECT s.guid as id, s.itemVariantId as modelId,
           COALESCE(CONCAT(i.itemName, ' (', itv.variantName, ')'), 'Unknown Item') as modelName,
           COALESCE(b.brandName, '') as company,
           s.serialNumber as serialNumber, s.godownGuid, g.godownName, s.landingPrice,
           0 as mrp,
           s.serialStatus as status, s.landingPriceReason, s.createdAt
    FROM inventorystockinserial s
    LEFT JOIN inventoryitemvariant itv ON s.itemVariantId=itv.itemVariantId AND itv.isDeleted=0 ${c("itv")}
    LEFT JOIN inventoryitemmaster i ON itv.itemId=i.itemId AND i.isDeleted=0 ${c("i")}
    LEFT JOIN inventorybrandmaster b ON i.brandId=b.brandId AND b.isDeleted=0 ${c("b")}
    LEFT JOIN godowns g ON s.godownGuid=g.guid AND g.isDeleted=0 ${c("g")}
    WHERE s.isDeleted=0 ${c("s")}
  `, params);
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
