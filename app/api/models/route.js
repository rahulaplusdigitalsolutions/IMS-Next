import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, ALL_AUTHENTICATED_ROLES, ApiError, requireCompany, resolveScopedCompanyGuid } from "@/lib/auth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";
import { broadcastRealtimeEvent } from "@/lib/realtimeEvents";

// Mounted behind `authorizeReadWrite({ readRoles: allRoles, writeRoles: ["Admin","User","Operator"],
// deleteRoles: ["Admin"], editColumnName: "allow_edit_models" })` in Backend4/index.js.
const authorize = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ALL_AUTHENTICATED_ROLES,
    writeRoles: ["Admin", "User", "Operator"],
    deleteRoles: ["Admin"],
    denyMessage: "Only Admin or Operators can manage models.",
    editColumnName: "allow_edit_models",
  });

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "GET");

  // companyGuid = null means the requester is authorized to see every company
  // (Dashboard's "All Companies" filter) — drop the scoping clauses entirely.
  const companyGuid = resolveScopedCompanyGuid(user, request);
  const clause = companyGuid ? "AND companyGuid = ?" : "";
  const mClause = companyGuid ? "AND m.companyGuid = ?" : "";
  const params = companyGuid ? [companyGuid, companyGuid, companyGuid] : [];

  const [rows] = await mysqlPool.query(`
    SELECT m.*, m.guid as id, m.\`ssd/hdd\` AS ssd,
      IFNULL(stock.availableCount,0) as stockCount,
      (SELECT landingPrice FROM serials WHERE modelGuid=m.guid AND isDeleted=0 ${clause} ORDER BY createdAt DESC LIMIT 1) as lastLandingPrice
    FROM models m
    LEFT JOIN (
      SELECT modelGuid, COUNT(*) as availableCount FROM serials
      WHERE status='Available' AND isDeleted=0 ${clause} GROUP BY modelGuid
    ) stock ON stock.modelGuid=m.guid
    WHERE m.isDeleted=0 ${mClause}
    ORDER BY m.name ASC
  `, params);
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireCompany(user);
  authorize(user, "POST");

  const { name, company, category, colorType, printerType, description, mrp, isSerialized, stockQuantity, packagingCost, mainCategory, cpu, ram, ssd, barcode, screenSize, resolution, panelType, refreshRate } = await parseJsonBody(request);

  if (name) {
    const [dup] = await mysqlPool.query("SELECT guid FROM models WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND isDeleted=0 AND companyGuid = ?", [name, user.companyId]);
    if (dup.length > 0) throw new ApiError(400, "A model with this name already exists.");
  }
  if (barcode && barcode.trim()) {
    const [bDup] = await mysqlPool.query("SELECT guid FROM models WHERE barcode=? AND isDeleted=0 AND companyGuid = ?", [barcode.trim(), user.companyId]);
    if (bDup.length > 0) throw new ApiError(400, "This barcode is already assigned to another model.");
  }
  await mysqlPool.query(
    "INSERT INTO models (guid,companyGuid,name,company,category,colorType,printerType,description,mrp,isSerialized,stockQuantity,packagingCost,mainCategory,cpu,ram,`ssd/hdd`,barcode,screenSize,resolution,panelType,refreshRate,isDeleted) VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
    [user.companyId, name, company, category, colorType || "Monochrome", printerType || "Multi-Function", description, mrp || 0, isSerialized !== false, stockQuantity || 0, packagingCost || 0, mainCategory || "Printer", cpu || null, ram || null, ssd || null, barcode?.trim() || null, screenSize || null, resolution || null, panelType || null, refreshRate || null]
  );
  await logUserActivity(mysqlPool, user, "Add Model", [{ field: "name", newValue: name }], request.headers.get("x-forwarded-for") || null);
  broadcastRealtimeEvent(user.companyId, "models");
  return NextResponse.json({ message: "Model added" });
});
