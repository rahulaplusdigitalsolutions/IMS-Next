import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/superAdminHelpers";
import { getActiveSessions } from "@/lib/sessionTracker";
import { getLocationsForIps } from "@/lib/geoLookup";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireSuperAdmin(user);

  try {
    const sessions = getActiveSessions(30);
    const locationMap = await getLocationsForIps(sessions.map((s) => s.ip));
    const enriched = sessions.map((s) => ({
      ...s,
      location: locationMap.get((s.ip || "").replace("::ffff:", ""))?.label || "Unknown",
    }));
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json(getActiveSessions(30).map((s) => ({ ...s, location: "Unknown" })));
  }
});
