import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, ApiError } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { uploadDir } from "@/lib/upload";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const DELETE = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const { filename: rawFilename } = await params;
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  const filename = path.basename(rawFilename);
  const fp = path.join(uploadDir, filename);
  if (!fs.existsSync(fp)) throw new ApiError(404, "File not found");
  fs.unlinkSync(fp);
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Delete File" },
    { field: "File", newValue: filename },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "Deleted" });
});
