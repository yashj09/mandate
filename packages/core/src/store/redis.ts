import type { Plan } from "../plan/schema.ts";
import type { AuditEntry } from "../audit/log.ts";
import type { PendingApproval, Store, StoredApproval } from "./types.ts";

/**
 * The subset of a Redis client the store needs. `@upstash/redis` satisfies it (REST, serverless-safe); so do most
 * others with a thin adapter. Values are stored as JSON strings; reads tolerate clients that auto-deserialize.
 */
export interface RedisLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  zadd(key: string, member: { score: number; member: string }): Promise<unknown>;
  zrange(key: string, start: number, stop: number, opts?: { rev?: boolean }): Promise<unknown[]>;
  rpush(key: string, ...values: string[]): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const parse = <T,>(v: unknown): T | null => (v == null ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const stringify = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));

/**
 * Redis-backed Store for stateless hosts (Vercel, Lambda). Keys under `${prefix}:`.
 *   plan:<id> · plans (zset by createdAt) · approval:pending:<plan>:<step> · approval:signed:<plan>:<step> · audit (list)
 */
export function redisStore(redis: RedisLike, prefix = "mandate"): Store {
  const k = (...parts: (string | number)[]) => [prefix, ...parts].join(":");
  const akey = (planId: string, step: number) => `${planId}:${step}`;
  return {
    plans: {
      async get(id) { if (!SAFE_ID.test(id)) return null; return parse<Plan>(await redis.get(k("plan", id))); },
      async save(plan) {
        if (!SAFE_ID.test(plan.id)) throw new Error(`invalid plan id "${plan.id}"`);
        await redis.set(k("plan", plan.id), stringify(plan));
        await redis.zadd(k("plans"), { score: new Date(plan.createdAt).getTime(), member: plan.id });
      },
      async list() {
        const ids = (await redis.zrange(k("plans"), 0, 199, { rev: true })) as string[];
        const plans = await Promise.all(ids.map((id) => redis.get(k("plan", id))));
        return plans.map((p) => parse<Plan>(p)).filter((p): p is Plan => !!p);
      },
    },
    approvals: {
      async getPending(p, s) { return parse<PendingApproval>(await redis.get(k("approval", "pending", akey(p, s)))); },
      async putPending(a) { await redis.set(k("approval", "pending", akey(a.planId, a.step)), stringify(a)); },
      async get(p, s) { return parse<StoredApproval>(await redis.get(k("approval", "signed", akey(p, s)))); },
      async put(a) { await redis.set(k("approval", "signed", akey(a.planId, a.step)), stringify(a)); await redis.del(k("approval", "pending", akey(a.planId, a.step))); },
      async delete(p, s) { await redis.del(k("approval", "signed", akey(p, s)), k("approval", "pending", akey(p, s))); },
    },
    audit: {
      async write(e) { const full: AuditEntry = { ts: new Date().toISOString(), ...e }; await redis.rpush(k("audit"), stringify(full)); return full; },
      async read(planId) {
        const raw = await redis.lrange(k("audit"), -2000, -1);
        return raw.map((x) => parse<AuditEntry>(x)).filter((e): e is AuditEntry => !!e && (!planId || e.planId === planId));
      },
    },
  };
}
