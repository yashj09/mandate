// The web console is one surface over the published packages; the MCP server is another.
import { resolve } from "node:path";
import { createMandateFromEnv, fileStore, type MandateClient, type Store } from "@yashjain99/mandate-sdk";
import { redisStore } from "@yashjain99/mandate-sdk/store-redis";
import { MANDATE_SYSTEM_PROMPT, mandateToolApproval, mandateTools, runRepaymentCheck, summarizePlan } from "@yashjain99/mandate-ai";

// Everything is lazy: nothing touches env or the chain at import time, so read-only routes and `next build` work
// without an agent key (the SDK falls back to a read-only wallet when AGENT_PRIVATE_KEY is absent).
let _client: MandateClient | undefined;
let _store: Store | undefined;

/** Redis on stateless hosts (Vercel: Upstash via UPSTASH_* or the Marketplace's KV_REST_API_*), JSON files locally. */
async function pickStore(): Promise<Store> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    return redisStore(new Redis({ url, token }));
  }
  return fileStore(process.env.MANDATE_STORE_DIR ?? resolve(process.cwd(), "../../.data"));
}
export async function getClientAsync(): Promise<MandateClient> {
  _store ??= await pickStore();
  _client ??= createMandateFromEnv({ store: _store });
  return _client;
}
/** Sync accessor for callers that already awaited getClientAsync() once in this process (routes call getClientAsync). */
export function getClient(): MandateClient {
  if (!_client) throw new Error("client not initialised; call getClientAsync() first");
  return _client;
}
let _tools: ReturnType<typeof mandateTools> | undefined;
export async function getTools() {
  const client = await getClientAsync();
  if (_tools) return _tools;
  const tools = mandateTools(client) as Record<string, any>;
  // Operator kill switch: flip MANDATE_EXECUTION_ENABLED=false in the host's env to stop all execution instantly.
  const exec = tools.execute_step;
  tools.execute_step = { ...exec, execute: async (input: unknown, ctx: unknown) => (process.env.MANDATE_EXECUTION_ENABLED === "false" ? { ok: false, error: "execution is disabled by the operator right now" } : exec.execute(input, ctx)) };
  return (_tools = tools as ReturnType<typeof mandateTools>);
}
export const getToolApproval = async () => mandateToolApproval(await getClientAsync());
export const SYSTEM_PROMPT = MANDATE_SYSTEM_PROMPT;
export const cron = async (days?: number) => runRepaymentCheck(await getClientAsync(), days);
export { summarizePlan };
