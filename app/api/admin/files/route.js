import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { uploadDir } from "@/lib/upload";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  const backendUri = process.env.BACKEND_URI || "";
  const files = fs.readdirSync(uploadDir).map((filename) => {
    const fp = path.join(uploadDir, filename);
    const stat = fs.statSync(fp);
    return { filename, size: stat.size, modifiedAt: stat.mtime, url: `${backendUri}/uploads/${filename}` };
  });
  files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return NextResponse.json(files);
});
