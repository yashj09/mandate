// Prints whether Redis env is configured and how many Mandate keys exist. Never prints secrets.
import { Redis } from "@upstash/redis";
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
console.log("redis env configured:", !!(url && token), url ? `(host ${new URL(url).host})` : "");
if (url && token) {
  const r = new Redis({ url, token });
  const keys = await r.keys("mandate:*");
  console.log("mandate keys:", keys.length, keys.slice(0, 8).map((k) => k.replace(/:[^:]+$/, ":…")).join(", "));
}
