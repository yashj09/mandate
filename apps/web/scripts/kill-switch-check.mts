// Manual check for the operator kill switch. Run from apps/web:
//   MANDATE_EXECUTION_ENABLED=false ../../packages/agent/node_modules/.bin/tsx --env-file=../../.env scripts/kill-switch-check.mts
import { getTools } from "../lib/agent.ts";
const t: any = await getTools();
const r = await t.execute_step.execute({ planId: process.argv[2] ?? "plan-mtymjwc4", step: 2 }, {});
console.log(process.env.MANDATE_EXECUTION_ENABLED === "false" ? "kill switch →" : "enabled →", r.awaitingGuardian ? "awaitingGuardian (real path)" : JSON.stringify(r).slice(0, 140));
