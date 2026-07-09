import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, authorizeOrdersRequest, requireAuth, ApiError } from "@/lib/auth";
import { safeDate } from "@/lib/helpers";
import { withErrorHandling, parseJsonBody } from "@/lib/apiResponse";

export const PUT = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeOrdersRequest(user, "PUT", new URL(request.url).pathname, null);
  requireAuth(user);
  const { id } = await params;

  const { warrantyStartDate } = await parseJsonBody(request);
  const [itemRows] = await mysqlPool.query("SELECT guid FROM order_items WHERE guid=?", [id]);
  if (!itemRows.length) throw new ApiError(404, "Order item not found");

  await mysqlPool.query("UPDATE order_items SET warrantyStartDate=? WHERE guid=?", [safeDate(warrantyStartDate) || null, id]);
  return NextResponse.json({ message: "Warranty start date updated" });
});
