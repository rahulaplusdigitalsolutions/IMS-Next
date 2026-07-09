// Ported from Backend4/utils/sessionTracker.js. Was wired as global Express
// middleware (`app.use(trackActivity)`); here it's invoked from
// `authenticateRequest()` in lib/auth.js so every authenticated route call
// updates it the same way.
const globalForSessions = globalThis;
const sessions = globalForSessions.__imsSessions || new Map(); // userId -> session object
if (!globalForSessions.__imsSessions) globalForSessions.__imsSessions = sessions;

export function trackActivity(user, request) {
  if (user?.id) {
    const url = new URL(request.url);
    sessions.set(user.id, {
      userId: user.id,
      username: user.username,
      role: user.role,
      lastPath: `${request.method} ${url.pathname}`,
      lastActivity: new Date(),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    });
  }
}

export function getActiveSessions(thresholdMinutes = 30) {
  const cutoff = Date.now() - thresholdMinutes * 60 * 1000;
  const active = [];
  for (const [, s] of sessions) {
    if (new Date(s.lastActivity).getTime() > cutoff) active.push(s);
  }
  return active.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

export function removeSession(userId) {
  sessions.delete(String(userId));
}
