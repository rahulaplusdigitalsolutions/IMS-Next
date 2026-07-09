import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { getConfig, getCachedAuth } from "@/lib/delhivery";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  const config = getConfig();
  const cachedAuth = getCachedAuth();
  return NextResponse.json({
    authMode: config.apiToken ? "token" : "login",
    loginUrl: config.loginUrl,
    usernameConfigured: Boolean(config.username),
    passwordConfigured: Boolean(config.password),
    apiTokenConfigured: Boolean(config.apiToken),
    pickupLocationConfigured: Boolean(config.pickupLocation),
    shipperConfigured: Boolean(config.shipper.name && config.shipper.address && config.shipper.pincode),
    tokenCached: Boolean(cachedAuth?.token),
    loggedInAt: cachedAuth?.loggedInAt || null,
  });
});
