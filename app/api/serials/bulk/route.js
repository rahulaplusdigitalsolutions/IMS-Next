import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireCompany } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";
import { broadcastRealtimeEvent } from "@/lib/realtimeEvents";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorizeSerials(user, "POST");

  const { serials } = await parseJsonBody(request);
  const results = { success: [], failed: [] };

  const values = serials.map((s) => s.value?.trim()).filter(Boolean);
  const [existing] = values.length
    ? await mysqlPool.query("SELECT value FROM serials WHERE value IN (?) AND isDeleted=0 AND companyGuid=?", [values, user.companyId])
    : [[]];
  const existingSet = new Set(existing.map((r) => r.value));

  for (const serial of serials) {
    const trimmed = serial.value?.trim();
    if (!trimmed) { results.failed.push({ value: serial.value, reason: "Empty serial value" }); continue; }
    if (existingSet.has(trimmed)) { results.failed.push({ value: trimmed, reason: "Already exists" }); continue; }
    try {
      const [mCheck] = await mysqlPool.query("SELECT mrp FROM models WHERE guid=? AND isDeleted=0 AND companyGuid=?", [serial.modelId, user.companyId]);
      let reasonValue = null;
      if (mCheck.length > 0) {
        const mrp = Number(mCheck[0].mrp) || 0;
        const lp = Number(serial.landingPrice) || 0;
        if (lp > mrp && mrp > 0) {
          if (!serial.landingPriceReason?.trim()) { results.failed.push({ value: trimmed, reason: `Landing Price (₹${lp}) exceeds MRP (₹${mrp}). Reason required.`, requiresReason: true }); continue; }
          reasonValue = serial.landingPriceReason.trim();
        }
      }
      const serialGuid = randomUUID();
      await mysqlPool.query(
        "INSERT INTO serials (guid,companyGuid,modelGuid,godownGuid,value,landingPrice,landingPriceReason,status,isDeleted,createdAt) VALUES (?,?,?,?,?,?,?,'Available',0,NOW())",
        [serialGuid, user.companyId, serial.modelId, serial.godownGuid || serial.warehouseGuid || null, trimmed, serial.landingPrice || 0, reasonValue]
      );
      existingSet.add(trimmed);
      results.success.push({ id: serialGuid, value: trimmed });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        results.failed.push({ value: trimmed, reason: "Already exists" });
      } else {
        results.failed.push({ value: trimmed, reason: e.message });
      }
    }
  }
  if (results.success.length > 0) broadcastRealtimeEvent(user.companyId, "serials");
  return NextResponse.json({ message: "Bulk add completed", results });
});
