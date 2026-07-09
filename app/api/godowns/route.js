import { NextResponse } from "next/server";
import crypto from "crypto";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeGodowns } from "@/lib/godownsAuth";
import { safeStr, toBit, logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeGodowns(user, "GET");

  const [rows] = await mysqlPool.query(
    "SELECT guid, godownName, godownAddress, isDefault, createdAt, updatedAt FROM godowns WHERE isDeleted=0 ORDER BY isDefault DESC, godownName ASC"
  );
  return NextResponse.json(rows);
});

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeGodowns(user, "POST");

  const { godownName, godownAddress, isDefault } = await parseJsonBody(request);
  const name = safeStr(godownName, "");
  if (!name) throw new ApiError(400, "Godown name is required");
  if (toBit(isDefault)) await mysqlPool.query("UPDATE godowns SET isDefault=0 WHERE isDeleted=0");
  const guid = crypto.randomUUID();
  await mysqlPool.query("INSERT INTO godowns (guid,godownName,godownAddress,isDefault) VALUES (?,?,?,?)", [guid, name, safeStr(godownAddress, ""), toBit(isDefault) ? 1 : 0]);
  await logUserActivity(mysqlPool, user, "Add Godown", [{ field: "name", newValue: name }], request.headers.get("x-forwarded-for") || null);
  return NextResponse.json({ message: "Godown added", guid }, { status: 201 });
});
