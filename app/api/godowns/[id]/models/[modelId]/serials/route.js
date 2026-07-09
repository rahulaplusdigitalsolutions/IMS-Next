import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeGodowns } from "@/lib/godownsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeGodowns(user, "GET");
  const { id, modelId } = await params;

  const [rows] = await mysqlPool.query(
    "SELECT guid as id, value as serialNumber FROM serials WHERE godownGuid=? AND modelGuid=? AND status='Available' AND isDeleted=0 ORDER BY value ASC",
    [id, modelId]
  );
  return NextResponse.json(rows);
});
