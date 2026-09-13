import { NextResponse, type NextRequest } from "next/server";
import { RULES, checkLimit, clientIp, type RuleName } from "@/lib/ratelimit";

/**
 * Public-console guard rails, applied before any /api route runs:
 *  - per-IP sliding-window limits (and a global daily budget for the model-backed chat)
 *  - same-origin check on state-changing POSTs
 * The on-chain mandate (per-tx and daily USDC caps, guardian for irreversible steps) remains the hard bound on spend.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  if (pathname.startsWith("/api/cron")) return NextResponse.next(); // protected by CRON_SECRET in the route

  if (method === "POST" && (pathname === "/api/chat" || pathname === "/api/approval")) {
    const origin = req.headers.get("origin") ?? (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "cross-origin requests are not allowed" }, { status: 403 });
    }
  }

  const ip = clientIp(req);
  const rules: Array<[RuleName, string]> =
    pathname === "/api/chat" && method === "POST" ? [["chat_burst", ip], ["chat_daily", ip], ["chat_global", "all"]]
    : pathname === "/api/approval" ? [[method === "POST" ? "approval_post" : "approval_get", ip]]
    : [["read", ip]];

  for (const [rule, id] of rules) {
    const r = await checkLimit(rule, id);
    if (!r.success) {
      const retry = Math.max(1, Math.ceil((r.resetMs - Date.now()) / 1000));
      return NextResponse.json(
        { error: rule === "chat_global" ? "The public demo has reached today's global request budget. Try again tomorrow or run Mandate locally." : `Rate limit reached (${RULES[rule].limit} per ${RULES[rule].window}). Try again in ${retry}s.`, retryAfterSeconds: retry, rule },
        { status: 429, headers: { "Retry-After": String(retry), "X-RateLimit-Limit": String(r.limit), "X-RateLimit-Remaining": String(r.remaining) } },
      );
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
