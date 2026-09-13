# Mandate

**Your AI agent executes real on-chain financial actions for you, inside limits you set, with a hardware tap for anything irreversible.**

> **App:** https://mandateagents.vercel.app · **Docs:** https://mandate-docs.vercel.app/docs · **npm:** `@yashjain99/mandate-sdk`, `@yashjain99/mandate-ai`, `@yashjain99/mandate-mcp`

Tell the agent *"I need 100 USDC on Arc by Friday to pay Acme. Don't sell my ETH."* It shops borrow rates across lending protocols with one standardized query on The Graph, drafts and simulates a plan, borrows real Circle USDC against your WETH on Compound v3 (Base Sepolia), bridges it to Arc over CCTP v2, pays the recipient, and schedules the repayment.

Every step is checked on-chain against a **mandate** you control: an allow-list of contract calls, a per-transaction cap and a rolling daily cap measured on what actually leaves the account. Irreversible steps wait for a **Ledger co-signature**, clear-signed as plain text that the contract rebuilds and verifies. The contract enforces the limits, not the model.

## How it works

1. **You set a mandate.** Per-transaction cap, daily cap, expiry and an allow-list of calls, signed by your wallet and stored in your `MandateAccount`.
2. **The agent plans.** Your intent becomes a deterministic plan of typed steps, each marked reversible or irreversible, then simulated against live chain state.
3. **Reversible steps run alone.** Wrapping, supplying collateral and borrowing can be unwound, so the agent executes them within the caps without asking.
4. **Irreversible steps wait for a tap.** Bridges and payments require a guardian signature from a Ledger. The device shows the exact approval text; the contract rebuilds it byte for byte and refuses anything else.
5. **Everything leaves a receipt.** Each step records a transaction hash and the reasoning behind it in the audit trail.

## Try it

- **Chat with the live agent:** https://mandateagents.vercel.app/chat. It borrows on its own and stops at the bridge for a Ledger it does not have. That is the point.
- **Read-only MCP against the public account:** `MANDATE_ACCOUNT=0x58612CE0945666cf58CA7e24808625a3cF10C5c3 npx -y @yashjain99/mandate-mcp`
- **Your own account:** [Deploy an account](https://mandate-docs.vercel.app/docs/guides/deploy-account), then [run the console](https://mandate-docs.vercel.app/docs/guides/run-console) or [wire the tools into your agent](https://mandate-docs.vercel.app/docs/guides/build-an-agent).

## Packages

| Package | What it is |
|---|---|
| `@yashjain99/mandate-sdk` | Client, actions, recipes, simulation, stores, guardians (Ledger), market data (The Graph) |
| `@yashjain99/mandate-ai` | Vercel AI SDK tools with tool approval, MCP registration, system prompt, repayment cron |
| `@yashjain99/mandate-mcp` | MCP server (stdio / Streamable HTTP) for Claude Desktop, Cursor and Claude Code |

## Layout

```
contracts/        Foundry: MandateAccount, MandateFactory, unit tests + Base Sepolia fork test, deploy scripts
packages/core/    @yashjain99/mandate-sdk
packages/agent/   @yashjain99/mandate-ai
apps/mcp/         @yashjain99/mandate-mcp
apps/web/         Next.js console: chat, owner page, activity, Ledger WebHID approval sheet (Vercel + Upstash)
apps/docs/        Documentation site (Fumadocs)
examples/         node-script (SDK without an LLM), vercel-ai-agent (agent in 50 lines)
skills/           mandate-agent (operate an account), mandate-integrate (add Mandate to your agent)
docs/             internal notes: review logs, walkthrough script, Ledger integration log
```

## Develop

```bash
git clone --recursive https://github.com/yashj09/mandate && cd mandate
pnpm install                        # builds sdk / ai / mcp (prepare hook)
cd contracts && forge test          # unit tests; add BASE_SEPOLIA_RPC=… --match-contract Fork for the fork test
cd .. && pnpm -r typecheck && pnpm test
pnpm dev                            # console on :3000 (reads ./.env)
pnpm --filter @mandate/docs dev     # docs on :3001
```

Deployed on Base Sepolia (84532) and Arc testnet (5042002) at the same addresses: `MandateFactory 0xA34164910f77E6E2965E89166542e40B293E47F9`, public `MandateAccount 0x58612CE0945666cf58CA7e24808625a3cF10C5c3`.

## Built on

| Rail | Where |
|---|---|
| Arc / Circle | Contracts on Arc testnet with native-USDC accounting; `packages/core/src/exec/cctp.ts` + adapters (CCTP v2 Fast Transfer, Iris attestations); `packages/core/src/wallet/circle.ts` (developer-controlled wallets); payments and repayment intents settle on Arc |
| The Graph | `packages/core/src/markets/graph.ts`: one Messari standardized-lending query across Aave v3, Compound v3 and Spark, with health probe and Aave-official fallback; `rankVenues` picks the venue |
| Ledger | Guardian role: EIP-191 clear-signed approval text rebuilt on-chain (`MandateAccount.approvalText`); `@yashjain99/mandate-sdk/ledger-web` (DMK + WebHID) and `ledgerNodeGuardian` (USB) |

## License

MIT
