import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { authorizeFbfFbaMaster } from "@/lib/fbfFbaMasterAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeFbfFbaMaster(user, "DELETE");
  const { guid } = await params;

  const [[platform]] = await mysqlPool.query("SELECT name FROM fbf_fba_platforms WHERE guid = ?", [guid]);
  if (!platform) throw new ApiError(404, "Platform not found");
  const [[{ cnt }]] = await mysqlPool.query("SELECT COUNT(*) as cnt FROM fbf_fba_warehouses WHERE platform = ? AND isDeleted = 0", [platform.name]);
  if (cnt > 0) throw new ApiError(400, "Cannot delete: this platform is used by one or more warehouses.");
  await mysqlPool.query("DELETE FROM fbf_fba_platforms WHERE guid = ?", [guid]);
  return NextResponse.json({ message: "Platform deleted" });
});
