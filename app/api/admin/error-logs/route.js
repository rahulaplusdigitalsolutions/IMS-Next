import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin, requireOtp } from "@/lib/superAdminHelpers";
import { logUserActivity } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

const logFile = path.join(process.cwd(), "hostinger_error.log");

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  if (!fs.existsSync(logFile)) return NextResponse.json({ lines: [] });
  const content = fs.readFileSync(logFile, "utf-8");
  const lines = content.split("\n").filter(Boolean).slice(-300).reverse();
  return NextResponse.json({ lines });
});

export const DELETE = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);
  const body = await parseJsonBody(request);
  requireOtp(user, body);

  if (fs.existsSync(logFile)) fs.writeFileSync(logFile, "");
  await logUserActivity(mysqlPool, user, "SuperAdmin Action", [
    { field: "Action", newValue: "Clear Error Logs" },
    { field: "Reason", newValue: body.reason || "No reason provided" },
  ], request.headers.get("x-forwarded-for") || null);

  return NextResponse.json({ message: "Error log cleared." });
});
