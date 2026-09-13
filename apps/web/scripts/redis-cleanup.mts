// Lists rate-limit keys and (with --purge) removes test plans from Redis so the public Activity page starts clean.
import { Redis } from "@upstash/redis";
const r = Redis.fromEnv();
const rl = await r.keys("mandate:rl:*");
console.log("rate-limit keys in redis:", rl.length, rl.slice(0, 2).map((k) => k.replace(/:[^:]*$/, ":…")).join(", "));
if (process.argv.includes("--purge")) {
  const keys = (await r.keys("mandate:*")).filter((k) => !k.startsWith("mandate:rl:"));
  if (keys.length) await r.del(...keys);
  console.log("purged", keys.length, "mandate data keys (rate-limit counters kept)");
}
