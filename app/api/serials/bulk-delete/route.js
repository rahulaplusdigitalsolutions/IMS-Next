import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeSerials } from "@/lib/serialsAuth";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const POST = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeSerials(user, "POST");

  const body = await parseJsonBody(request);
  const ids = Array.isArray(body.ids) ? body.ids : [body.ids];
  if (ids.length > 0) await mysqlPool.query("UPDATE serials SET isDeleted=1 WHERE guid IN (?)", [ids]);
  return NextResponse.json({ message: "Bulk deleted (soft)" });
});
