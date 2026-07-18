import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth, requireCompany, ApiError } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireAuth(user);
  requireCompany(user);
  const { guid } = await params;

  const [rows] = await mysqlPool.query("SELECT * FROM model_approval_requests WHERE guid=? AND isDeleted=0", [guid]);
  if (!rows.length) throw new ApiError(404, "Request not found.");
  const r = rows[0];
  if (r.status !== "pending") throw new ApiError(400, "This request is not pending.");

  const [existing] = await mysqlPool.query("SELECT guid FROM models WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND isDeleted=0 AND companyGuid=?", [r.name, user.companyId]);
  if (existing.length > 0) throw new ApiError(400, "A model with this name already exists.");

  const body = (await parseJsonBody(request)) || {};
  const finalName = (body.name && body.name.trim()) || r.name;
  const finalCompany = body.company !== undefined ? body.company : (r.company || null);
  const finalCategory = body.category !== undefined ? body.category : (r.category || null);
  const finalColorType = body.colorType !== undefined ? body.colorType : (r.colorType || "Monochrome");
  const finalPrinterType = body.printerType !== undefined ? body.printerType : (r.printerType || "Multi-Function");
  const finalDesc = body.description !== undefined ? body.description : (r.description || null);
  const finalMrp = body.mrp !== undefined ? Number(body.mrp) : (Number(r.mrp) || 0);
  const finalMainCat = body.mainCategory !== undefined ? body.mainCategory : (r.mainCategory || "Printer");
  const finalCpu = body.cpu !== undefined ? body.cpu : (r.cpu || null);
  const finalRam = body.ram !== undefined ? body.ram : (r.ram || null);
  const finalSsd = body.ssd !== undefined ? body.ssd : (r.ssdHdd || null);
  const finalBarcode = body.barcode !== undefined ? body.barcode : null;
  const finalScreenSize = body.screenSize !== undefined ? body.screenSize : (r.screenSize || null);
  const finalResolution = body.resolution !== undefined ? body.resolution : (r.resolution || null);
  const finalPanelType = body.panelType !== undefined ? body.panelType : (r.panelType || null);
  const finalRefreshRate = body.refreshRate !== undefined ? body.refreshRate : (r.refreshRate || null);

  const newModelGuid = uuidv4();

  await mysqlPool.query(
    "INSERT INTO models (guid,companyGuid,name,company,category,colorType,printerType,description,mrp,isSerialized,stockQuantity,packagingCost,mainCategory,cpu,ram,`ssd/hdd`,barcode,screenSize,resolution,panelType,refreshRate,isDeleted) VALUES (?,?,?,?,?,?,?,?,?,1,0,0,?,?,?,?,?,?,?,?,?,0)",
    [
      newModelGuid, user.companyId,
      finalName, finalCompany, finalCategory,
      finalColorType, finalPrinterType,
      finalDesc, finalMrp,
      finalMainCat,
      finalCpu || null, finalRam || null, finalSsd || null,
      finalBarcode || null,
      finalScreenSize, finalResolution, finalPanelType, finalRefreshRate,
    ]
  );

  if (r.serialNumber && r.serialNumber.trim()) {
    await mysqlPool.query(
      "INSERT INTO serials (guid, companyGuid, modelGuid, godownGuid, value, landingPrice, landingPriceReason, status, isDeleted, createdAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'Available', 0, NOW())",
      [user.companyId, newModelGuid, r.godownGuid || null, r.serialNumber.trim(), r.landingPrice || 0, r.landingPriceReason || null]
    );
  }

  if (r.variantId) {
    await mysqlPool.query(
      "UPDATE serials SET modelGuid = ? WHERE modelGuid = ? AND status = 'Available' AND isDeleted = 0 AND companyGuid = ?",
      [newModelGuid, r.variantId, user.companyId]
    );
  }

  const approver = user?.username || "Admin";
  await mysqlPool.query(
    "UPDATE model_approval_requests SET status='approved', approvedBy=?, approvedAt=NOW(), linkedModelGuid=? WHERE guid=?",
    [approver, newModelGuid, guid]
  );

  if (r.requestedByGuid) {
    await createNotification(mysqlPool, {
      targetUserGuid: r.requestedByGuid,
      title: "Model Request Approved ✓",
      message: `Your request to add model "${finalName}" was approved! It is now available in the Models tab.`,
      type: "success",
      priority: "low",
      link: "/models",
      companyGuid: user.companyId,
    });
  }

  return NextResponse.json({ message: `Model "${finalName}" approved and added to the system.` });
});
