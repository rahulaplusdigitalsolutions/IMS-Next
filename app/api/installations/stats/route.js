import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { authorizeInstallations } from "@/lib/installationsAuth";
import { INSTALL_REQUIRED_CONDITION } from "@/lib/installationsQuery";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInstallations(user, "GET");

  const [rows] = await mysqlPool.query(`
    SELECT COUNT(oi.guid) as total,
      SUM(CASE WHEN ins.installationStatus='Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN ins.installationStatus='Scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN ins.installationStatus='In Progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN ins.installationStatus='Completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN ins.installationStatus='Cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(IFNULL(ins.installationCharges,0)) as totalCharges
    FROM order_items oi JOIN orders o ON oi.orderGuid=o.guid
    JOIN order_installations ins ON o.guid=ins.orderGuid
    WHERE ${INSTALL_REQUIRED_CONDITION} AND o.isDeleted=0
  `);
  return NextResponse.json(rows[0]);
});
