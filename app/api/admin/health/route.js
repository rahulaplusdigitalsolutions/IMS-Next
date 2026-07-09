import os from "os";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { uploadDir } from "@/lib/upload";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  let dbStatus = "ok";
  let dbLatency = null;
  try {
    const start = Date.now();
    await mysqlPool.query("SELECT 1");
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = "error";
  }

  let fileCount = 0;
  let uploadSize = 0;
  try {
    const files = fs.readdirSync(uploadDir);
    fileCount = files.length;
    for (const f of files) {
      try { uploadSize += fs.statSync(path.join(uploadDir, f)).size; } catch {}
    }
  } catch {}

  return NextResponse.json({
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    cpuCount: os.cpus().length,
    memory: { total: os.totalmem(), used: os.totalmem() - os.freemem(), free: os.freemem() },
    db: { status: dbStatus, latencyMs: dbLatency },
    uploads: { fileCount, totalSizeBytes: uploadSize },
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});
