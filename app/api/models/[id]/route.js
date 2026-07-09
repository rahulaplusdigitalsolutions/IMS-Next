import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeReadWrite, ALL_AUTHENTICATED_ROLES, ApiError } from "@/lib/auth";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

const authorize = (user, method) =>
  authorizeReadWrite(user, method, {
    readRoles: ALL_AUTHENTICATED_ROLES,
    writeRoles: ["Admin", "User", "Operator"],
    deleteRoles: ["Admin"],
    denyMessage: "Only Admin or Operators can manage models.",
    editColumnName: "allow_edit_models",
  });

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorize(user, "PUT");
  const { id } = await params;

  const { name, company, category, colorType, printerType, description, mrp, isSerialized, stockQuantity, packagingCost, mainCategory, cpu, ram, ssd, barcode, screenSize, resolution, panelType, refreshRate } = await parseJsonBody(request);

  const [existing] = await mysqlPool.query("SELECT * FROM models WHERE guid=? AND isDeleted=0", [id]);
  if (!existing.length) throw new ApiError(404, "Model not found");
  const cur = existing[0];

  if (name && name.trim().toLowerCase() !== (cur.name || "").trim().toLowerCase()) {
    const [dup] = await mysqlPool.query("SELECT guid FROM models WHERE LOWER(TRIM(name))=LOWER(TRIM(?)) AND guid!=? AND isDeleted=0", [name, id]);
    if (dup.length > 0) throw new ApiError(400, "A model with this name already exists.");
  }
  if (barcode && barcode.trim() && barcode.trim() !== (cur.barcode || "")) {
    const [bDup] = await mysqlPool.query("SELECT guid FROM models WHERE barcode=? AND guid!=? AND isDeleted=0", [barcode.trim(), id]);
    if (bDup.length > 0) throw new ApiError(400, "This barcode is already assigned to another model.");
  }

  const fc = (v, fb) => (v !== undefined && v !== "" ? v : fb);
  const newBarcode = barcode !== undefined ? (barcode?.trim() || null) : cur.barcode;

  await mysqlPool.query(
    "UPDATE models SET name=?,company=?,category=?,colorType=?,printerType=?,description=?,mrp=?,isSerialized=?,stockQuantity=?,packagingCost=?,mainCategory=?,cpu=?,ram=?,`ssd/hdd`=?,barcode=?,screenSize=?,resolution=?,panelType=?,refreshRate=? WHERE guid=? AND isDeleted=0",
    [name || cur.name, company || cur.company, category || cur.category,
      fc(colorType, cur.colorType || "Monochrome"), fc(printerType, cur.printerType || "Multi-Function"),
      description !== undefined ? description : cur.description,
      mrp !== undefined ? mrp : cur.mrp,
      isSerialized !== undefined ? isSerialized : cur.isSerialized,
      stockQuantity !== undefined ? stockQuantity : cur.stockQuantity,
      packagingCost !== undefined ? packagingCost : cur.packagingCost,
      fc(mainCategory, cur.mainCategory || "Printer"),
      cpu !== undefined ? cpu : cur.cpu,
      ram !== undefined ? ram : cur.ram,
      ssd !== undefined ? ssd : cur["ssd/hdd"],
      newBarcode,
      screenSize !== undefined ? screenSize : cur.screenSize,
      resolution !== undefined ? resolution : cur.resolution,
      panelType !== undefined ? panelType : cur.panelType,
      refreshRate !== undefined ? refreshRate : cur.refreshRate,
      id]
  );
  await logUserActivity(mysqlPool, user, "Update Model", [{ field: "name", newValue: name || cur.name }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Model updated" });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorize(user, "DELETE");
  const { id } = await params;

  const conn = await mysqlPool.getConnection();
  let blockedBySerials = false;
  try {
    await conn.beginTransaction();
    try {
      const [check] = await conn.query("SELECT COUNT(*) as c FROM serials WHERE modelGuid=? AND isDeleted=0 FOR UPDATE", [id]);
      if (check[0].c > 0) {
        await conn.rollback();
        blockedBySerials = true;
      } else {
        await conn.query("UPDATE models SET isDeleted=1 WHERE guid=?", [id]);
        await conn.commit();
      }
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } finally {
    conn.release();
  }
  if (blockedBySerials) throw new ApiError(400, "Cannot delete: Model has active serials.");
  await logUserActivity(mysqlPool, user, "Delete Model", [{ field: "id", oldValue: id, newValue: "Deleted" }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Model deleted (soft)" });
});
