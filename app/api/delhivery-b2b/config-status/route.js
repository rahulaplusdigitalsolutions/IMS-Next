import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { getB2BConfig, getCachedB2BAuth } from "@/lib/delhiveryB2B";
import { withErrorHandling } from "@/lib/apiResponse";

export const GET = withErrorHandling(async (request) => {
  const user = await authenticateRequest(request);
  requireAuth(user);

  const config = getB2BConfig();
  const cachedAuth = getCachedB2BAuth();
  return NextResponse.json({
    usernameConfigured: Boolean(config.username),
    passwordConfigured: Boolean(config.password),
    baseUrlConfigured: Boolean(config.baseUrl),
    loginUrl: config.loginUrl,
    tokenCached: Boolean(cachedAuth?.token),
    loggedInAt: cachedAuth?.loggedInAt || null,
  });
});
