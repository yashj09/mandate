import { describe, expect, it } from "vitest";
import { redisStore, type RedisLike } from "../src/store/redis.ts";
import type { Plan } from "../src/plan/schema.ts";

/** Minimal in-memory Redis fake covering the methods the store uses. */
function fakeRedis(): RedisLike & { dump(): Record<string, unknown> } {
  const kv = new Map<string, string>(); const z = new Map<string, Map<string, number>>(); const lists = new Map<string, string[]>();
  return {
    dump: () => Object.fromEntries(kv),
    async get(key) { return kv.get(key) ?? null; },
    async set(key, value) { kv.set(key, value); },
    async del(...keys) { for (const k of keys) kv.delete(k); },
    async zadd(key, { score, member }) { const m = z.get(key) ?? new Map(); m.set(member, score); z.set(key, m); },
    async zrange(key, start, stop, opts) { const arr = [...(z.get(key) ?? new Map()).entries()].sort((a, b) => (opts?.rev ? b[1] - a[1] : a[1] - b[1])).map(([m]) => m); return arr.slice(start, stop + 1); },
    async rpush(key, ...values) { lists.set(key, [...(lists.get(key) ?? []), ...values]); },
    async lrange(key, start, stop) { const l = lists.get(key) ?? []; const s = start < 0 ? Math.max(0, l.length + start) : start; const e = stop < 0 ? l.length + stop : stop; return l.slice(s, e + 1); },
  };
}

const plan = (id: string, createdAt: string): Plan => ({ id, createdAt, intent: { kind: "liquidity", amountUsdc: 1, destinationChainId: 5042002, constraints: { doNotSell: [] }, repayInDays: 7 }, venueId: "v", venueExplanation: "", account: "0x0000000000000000000000000000000000000001", collateralWeth: "0", projected: { healthFactor: 1, liquidationPriceUsd: null, borrowAprPct: 0, wethPriceUsd: 0 }, steps: [] });

describe("redisStore", () => {
  it("round-trips plans newest first, approvals, and audit", async () => {
    const r = fakeRedis(); const s = redisStore(r, "t");
    await s.plans.save(plan("a", "2026-09-01T00:00:00Z"));
    await s.plans.save(plan("b", "2026-09-02T00:00:00Z"));
    expect((await s.plans.list()).map((p) => p.id)).toEqual(["b", "a"]);
    expect((await s.plans.get("a"))?.id).toBe("a");
    expect(await s.plans.get("../x")).toBeNull();
    await expect(s.plans.save(plan("../evil", "2026-09-01T00:00:00Z"))).rejects.toThrow(/invalid plan id/);

    const pending = { planId: "a", step: 2, chainId: 84532, guardian: "0x00" as const, text: "t", deadline: "1", nonce: "0", builtAt: "now" };
    await s.approvals.putPending(pending);
    expect((await s.approvals.getPending("a", 2))?.text).toBe("t");
    await s.approvals.put({ ...pending, signature: "0x01", signedAt: "now" });
    expect(await s.approvals.getPending("a", 2)).toBeNull();
    expect((await s.approvals.get("a", 2))?.signature).toBe("0x01");
    await s.approvals.delete("a", 2);
    expect(await s.approvals.get("a", 2)).toBeNull();

    await s.audit.write({ planId: "a", step: 1, kind: "info", summary: "one" });
    await s.audit.write({ planId: "b", step: 1, kind: "info", summary: "two" });
    expect((await s.audit.read()).map((e) => e.summary)).toEqual(["one", "two"]);
    expect((await s.audit.read("b")).map((e) => e.summary)).toEqual(["two"]);
  });

  it("tolerates clients that auto-deserialize JSON", async () => {
    const r = fakeRedis(); const raw = r.get.bind(r); (r as any).get = async (k: string) => { const v = await raw(k); return v == null ? null : JSON.parse(v as string); };
    const s = redisStore(r, "t"); await s.plans.save(plan("c", "2026-09-03T00:00:00Z"));
    expect((await s.plans.get("c"))?.id).toBe("c");
  });
});
