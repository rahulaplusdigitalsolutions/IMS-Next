import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { authorizeInventory } from "@/lib/inventoryAuth";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  authorizeInventory(user, "GET");
  requireAuth(user);

  const [drafts] = await mysqlPool.query("SELECT COUNT(*) as count FROM inventorystockin WHERE status = 0 AND isDeleted = 0");
  const [finalized] = await mysqlPool.query("SELECT COUNT(*) as count FROM inventorystockin WHERE status = 1 AND isDeleted = 0");
  return NextResponse.json({ draftCount: drafts[0].count, finalizedCount: finalized[0].count });
});
