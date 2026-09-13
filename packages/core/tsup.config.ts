import { defineConfig } from "tsup";
export default defineConfig({
  entry: { index: "src/index.ts", "ledger-web": "src/ledger-web.ts", abi: "src/abi.ts", chains: "src/chains.ts", "store-redis": "src/store-redis.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: [/^@ledgerhq\//, "rxjs", "@circle-fin/developer-controlled-wallets", "@upstash/redis", "viem", "node:fs", "node:path"],
});
