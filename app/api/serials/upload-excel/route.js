import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError, requireCompany } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling } from "@/lib/apiResponse";
import { uploadDir, saveUploadedFile } from "@/lib/upload";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeSerials(user, "POST");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") throw new ApiError(400, "No file uploaded");
  const targetModelId = formData.get("targetModelId") ? String(formData.get("targetModelId")).trim() : null;

  const saved = await saveUploadedFile(file);
  const filePath = path.join(uploadDir, saved.filename);

  try {
    const wb = xlsx.readFile(filePath);
    const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (!data.length) throw new ApiError(400, "Excel file is empty");

    const results = { success: [], failed: [], skipped: [], totalRows: data.length };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      try {
        const modelIdValue = row.modelId || row.modelid || row.ModelId || row["Model ID"] || row.model_id;
        const serialValue = row.value || row.Value || row.serialNumber || row.SerialNumber || row["Serial Number"] || row["Serial No"] || row.serial;
        const lpKey = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z]/g, "") === "landingprice");
        const rawLp = lpKey ? row[lpKey] : 0;
        const statusValue = row.status || row.Status || "Available";
        const reasonValue = row.landingPriceReason || row.LandingPriceReason || row.reason || row.Reason || null;
        const godownGuidValue = row.godownGuid || row.GodownGuid || row["Godown GUID"] || row["Godown Id"] || row["Godown ID"] || row.warehouseGuid || row["Warehouse GUID"] || null;

        if (!modelIdValue || !serialValue) { results.failed.push({ row: rowNum, serialNumber: serialValue || "N/A", reason: "Missing required fields: modelId or value" }); continue; }

        const modelId = String(modelIdValue).trim();
        if (targetModelId && modelId !== targetModelId) { results.skipped.push({ row: rowNum, serialNumber: String(serialValue), reason: "Skipped (Model Filter)" }); continue; }

        const trimmedSerial = String(serialValue).trim();
        let cleanLp = 0;
        if (rawLp !== undefined && rawLp !== null && rawLp !== "") cleanLp = Number(String(rawLp).replace(/[^0-9.]/g, ""));
        const landingPrice = isNaN(cleanLp) ? 0 : cleanLp;
        const landingPriceReason = reasonValue ? String(reasonValue).trim() : null;

        const [mCheck] = await mysqlPool.query("SELECT itemVariantId as id, sellingPrice as mrp, variantName as name FROM inventoryitemvariant WHERE itemVariantId=? AND isDeleted=0 AND companyGuid=?", [modelId, user.companyId]);
        if (!mCheck.length) { results.failed.push({ row: rowNum, serialNumber: trimmedSerial, reason: `Model ID ${modelId} not found` }); continue; }

        const [sCheck] = await mysqlPool.query("SELECT guid FROM inventorystockinserial WHERE serialNumber=? AND companyGuid=?", [trimmedSerial, user.companyId]);
        if (sCheck.length > 0) { results.failed.push({ row: rowNum, serialNumber: trimmedSerial, reason: "Serial number already exists" }); continue; }

        const modelMRP = Number(mCheck[0].mrp) || 0;
        let finalReason = null;
        if (landingPrice > modelMRP && modelMRP > 0) {
          if (!landingPriceReason) { results.failed.push({ row: rowNum, serialNumber: trimmedSerial, reason: "Landing Price exceeds MRP. Reason required.", requiresReason: true }); continue; }
          finalReason = landingPriceReason;
        }

        const godownGuid = godownGuidValue ? String(godownGuidValue).trim() : null;
        if (godownGuid) {
          const [gCheck] = await mysqlPool.query("SELECT guid FROM godowns WHERE guid=? AND isDeleted=0 AND companyGuid=?", [godownGuid, user.companyId]);
          if (!gCheck.length) { results.failed.push({ row: rowNum, serialNumber: trimmedSerial, reason: `Godown ${godownGuid} not found` }); continue; }
        }

        const serialGuid = randomUUID();
        await mysqlPool.query(
          "INSERT INTO inventorystockinserial (serialId,guid,companyGuid,itemVariantId,godownGuid,serialNumber,landingPrice,serialStatus,landingPriceReason,isUsed,isDeleted,createdAt) VALUES (?,?,?,?,?,?,?,?,?,0,0,NOW())",
          [serialGuid, serialGuid, user.companyId, modelId, godownGuid, trimmedSerial, landingPrice, String(statusValue).trim() || "Available", finalReason]
        );
        results.success.push({ row: rowNum, id: serialGuid, serialNumber: trimmedSerial, modelId, modelName: mCheck[0].name });
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          results.failed.push({ row: rowNum, serialNumber: row.value || "N/A", reason: "Serial number already exists" });
        } else {
          results.failed.push({ row: rowNum, serialNumber: row.value || "N/A", reason: e.message });
        }
      }
    }

    return NextResponse.json({ message: `Upload completed. Success: ${results.success.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`, results });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
