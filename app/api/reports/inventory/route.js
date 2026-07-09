import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeReports } from "@/lib/reportsAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeReports(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT m.name as modelName, m.company as companyName, m.category,
      COUNT(s.guid) as totalSerials,
      SUM(CASE WHEN s.status='Available' THEN 1 ELSE 0 END) as availableSerials,
      SUM(CASE WHEN s.status='Dispatched' THEN 1 ELSE 0 END) as dispatchedSerials,
      SUM(CASE WHEN s.status='Damaged' THEN 1 ELSE 0 END) as damagedSerials,
      AVG(s.landingPrice) as avgLandingPrice, m.stockQuantity
    FROM models m LEFT JOIN serials s ON m.guid=s.modelGuid AND s.isDeleted=0
    WHERE m.isDeleted=0 GROUP BY m.guid, m.name, m.company, m.category, m.stockQuantity ORDER BY m.name
  `);
  return NextResponse.json(rows);
});
