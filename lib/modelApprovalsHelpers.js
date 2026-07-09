import { mysqlPool } from "@/lib/db";

// Auto-resolve any 'pending' requests whose model name was created directly
// (e.g. via Models page) while the request was still sitting pending, so they
// don't linger forever as "pending" and error out when someone tries to approve them.
export async function autoResolveStalePendingRequests() {
  try {
    const [staleRows] = await mysqlPool.query(
      `SELECT r.guid, r.name, m.guid as modelGuid
       FROM model_approval_requests r
       JOIN models m ON LOWER(TRIM(m.name)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(r.name)) COLLATE utf8mb4_unicode_ci AND m.isDeleted = 0
       WHERE r.status = 'pending' AND r.isDeleted = 0`
    );
    for (const row of staleRows) {
      await mysqlPool.query(
        "UPDATE model_approval_requests SET status='approved', approvedBy=?, approvedAt=NOW(), linkedModelGuid=? WHERE guid=?",
        ["System (model already existed)", row.modelGuid, row.guid]
      );
    }
  } catch (err) {
    console.error("[modelApprovals] autoResolveStalePendingRequests:", err.message);
  }
}
