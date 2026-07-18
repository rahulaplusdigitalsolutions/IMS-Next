import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany, ApiError } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { autoResolveStalePendingRequests } from "@/lib/modelApprovalsHelpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  await autoResolveStalePendingRequests();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let sql = "SELECT r.*, g.godownName FROM model_approval_requests r LEFT JOIN godowns g ON r.godownGuid COLLATE utf8mb4_unicode_ci = g.guid COLLATE utf8mb4_unicode_ci WHERE r.isDeleted=0";
  const sqlParams = [];
  if (status) { sql += " AND r.status=?"; sqlParams.push(status); }
  sql += " ORDER BY r.createdAt DESC";
  const [rows] = await mysqlPool.query(sql, sqlParams);
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  requireCompany(user);

  const { name, company, category, colorType, printerType, description, mrp, mainCategory, cpu, ram, ssd, serialNumber, landingPrice, landingPriceReason, godownGuid, screenSize, resolution, panelType, refreshRate } = await parseJsonBody(request);
  if (!name || !name.trim()) throw new ApiError(400, "Model name is required.");

  const [existing] = await mysqlPool.query(
    "SELECT guid FROM models WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND isDeleted=0 AND companyGuid=?", [name, user.companyId]
  );
  if (existing.length > 0) {
    if (serialNumber && serialNumber.trim()) {
      const sn = serialNumber.trim();
      const [sCheck] = await mysqlPool.query("SELECT guid FROM serials WHERE value=? AND isDeleted=0 AND companyGuid=?", [sn, user.companyId]);
      if (sCheck.length > 0) throw new ApiError(400, `Serial number "${sn}" already exists in the system!`);
      await mysqlPool.query(
        "INSERT INTO serials (guid, companyGuid, modelGuid, godownGuid, value, landingPrice, landingPriceReason, status, isDeleted, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'Available', 0, NOW())",
        [user.companyId, existing[0].guid, godownGuid || null, sn, landingPrice || 0, landingPriceReason || null]
      );
      return NextResponse.json({ message: `Model already exists. Serial "${sn}" added directly to stock.`, directlyAdded: true, modelGuid: existing[0].guid });
    }
    throw new ApiError(400, "This model already exists in the system.");
  }

  const [dup] = await mysqlPool.query(
    "SELECT guid FROM model_approval_requests WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND status='pending' AND isDeleted=0", [name]
  );
  if (dup.length > 0) throw new ApiError(400, "An approval request for this model is already pending.");

  if (serialNumber && serialNumber.trim()) {
    const trimmedSerial = serialNumber.trim();
    const [sCheck] = await mysqlPool.query("SELECT guid FROM serials WHERE value=? AND isDeleted=0 AND companyGuid=?", [trimmedSerial, user.companyId]);
    if (sCheck.length > 0) throw new ApiError(400, `Serial number "${trimmedSerial}" already exists in the system!`);

    const [sPendingCheck] = await mysqlPool.query("SELECT guid FROM model_approval_requests WHERE serialNumber=? AND status='pending' AND isDeleted=0", [trimmedSerial]);
    if (sPendingCheck.length > 0) throw new ApiError(400, `Serial number "${trimmedSerial}" is already pending approval for another model!`);
  }

  const guid = randomUUID();
  await mysqlPool.query(
    `INSERT INTO model_approval_requests
      (guid, name, company, category, colorType, printerType, description, mrp, mainCategory, cpu, ram, ssdHdd, requestedBy, requestedByGuid, status, serialNumber, landingPrice, landingPriceReason, godownGuid, screenSize, resolution, panelType, refreshRate)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?,?,?,?,?)`,
    [
      guid, name.trim(), company || null, category || null,
      colorType || "Monochrome", printerType || "Multi-Function",
      description || null, mrp || 0, mainCategory || "Printer",
      cpu || null, ram || null, ssd || null,
      user?.username || "Unknown",
      user?.userid ? String(user.userid) : null,
      serialNumber?.trim() || null,
      landingPrice !== undefined && landingPrice !== null && landingPrice !== "" ? Number(landingPrice) : 0,
      landingPriceReason || null,
      godownGuid || null,
      screenSize || null, resolution || null, panelType || null, refreshRate || null,
    ]
  );

  await createNotification(mysqlPool, {
    targetRole: "Admin",
    title: "New Model Approval Request",
    message: `${user?.username || "A user"} requested to add model "${name.trim()}". Please review and approve in the Models tab.`,
    type: "info",
    priority: "low",
    link: "/models?tab=approvals",
    companyGuid: user.companyId,
  });

  return NextResponse.json({ message: "Approval request submitted. Admins have been notified.", guid });
});
