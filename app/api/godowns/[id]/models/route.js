import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeGodowns } from "@/lib/godownsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request, { params }) => {
  const user = await authenticateRequest(request);
  authorizeGodowns(user, "GET");
  const { id } = await params;

  const [rows] = await mysqlPool.query(
    `SELECT m.guid as modelId, m.name as modelName, COUNT(s.guid) as availableCount
     FROM serials s JOIN models m ON s.modelGuid=m.guid
     WHERE s.godownGuid=? AND s.status='Available' AND s.isDeleted=0
     GROUP BY m.guid, m.name ORDER BY m.name ASC`,
    [id]
  );
  return NextResponse.json(rows);
});
