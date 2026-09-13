/**
 * Rate limiting for the public console. Upstash sliding windows when Redis env is present (Vercel), an in-process
 * fallback otherwise (local dev). Fails open on Redis errors so a cache hiccup never takes the demo down.
 */
export interface LimitResult { success: boolean; limit: number; remaining: number; resetMs: number }
type Limiter = (id: string) => Promise<LimitResult>;

const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };

/** Rule table: name → [requests, window]. Tunable via env without a redeploy. */
export const RULES = {
  chat_burst: { limit: num("RL_CHAT_PER_10M", 8), window: "10 m", ms: 600_000 },
  chat_daily: { limit: num("RL_CHAT_PER_DAY", 40), window: "1 d", ms: 86_400_000 },
  chat_global: { limit: num("RL_CHAT_GLOBAL_PER_DAY", 400), window: "1 d", ms: 86_400_000 },
  approval_post: { limit: num("RL_APPROVAL_POST_PER_10M", 20), window: "10 m", ms: 600_000 },
  approval_get: { limit: num("RL_APPROVAL_GET_PER_10M", 60), window: "10 m", ms: 600_000 },
  read: { limit: num("RL_READ_PER_MIN", 120), window: "1 m", ms: 60_000 },
} as const;
export type RuleName = keyof typeof RULES;

const hasRedis = () => !!((process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN));

// ---- in-memory sliding window (dev fallback; per-instance) ----
const mem = new Map<string, number[]>();
function memoryLimiter(rule: RuleName): Limiter {
  const { limit, ms } = RULES[rule];
  return async (id) => {
    const now = Date.now(); const key = `${rule}:${id}`;
    const hits = (mem.get(key) ?? []).filter((t) => now - t < ms);
    const success = hits.length < limit;
    if (success) hits.push(now);
    mem.set(key, hits);
    return { success, limit, remaining: Math.max(0, limit - hits.length), resetMs: hits.length ? hits[0]! + ms : now + ms };
  };
}

const upstash = new Map<RuleName, Limiter>();
async function upstashLimiter(rule: RuleName): Promise<Limiter> {
  const cached = upstash.get(rule); if (cached) return cached;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RULES[rule].limit, RULES[rule].window), prefix: `mandate:rl:${rule}`, timeout: 1000, analytics: false });
  const fn: Limiter = async (id) => { const r = await rl.limit(id); return { success: r.success, limit: r.limit, remaining: r.remaining, resetMs: r.reset }; };
  upstash.set(rule, fn); return fn;
}

export async function checkLimit(rule: RuleName, id: string): Promise<LimitResult> {
  try {
    const fn = hasRedis() ? await upstashLimiter(rule) : memoryLimiter(rule);
    return await fn(id);
  } catch (e) {
    console.warn(`[ratelimit] ${rule} failed open: ${(e as Error).message}`);
    return { success: true, limit: RULES[rule].limit, remaining: RULES[rule].limit, resetMs: Date.now() };
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
