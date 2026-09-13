"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown } from "lucide-react";
import { Button, Card, Pill, Sticky } from "@/components/ui";
import { cx } from "@/lib/sketch";

type Row = {
  venueId: string;
  protocol: string;
  network: string;
  market: string;
  borrowAprPct: number;
  utilizationPct: number;
  availableUsd: number;
  source: string;
  executableOn: string | null;
};
type Markets = { fetchedAt: string; table: Row[]; cheapestMainnet: string | null; recommended: string | null; explanation: string; warnings: string[] };
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; data: Markets; at: string };

const PROTOCOL: Record<string, string> = { "compound-v3": "Compound v3", "aave-v3": "Aave v3", spark: "Spark", "morpho-blue": "Morpho Blue" };
const NETWORK: Record<string, string> = { "base-sepolia": "Base Sepolia", base: "Base", arbitrum: "Arbitrum", ethereum: "Ethereum", "arc-testnet": "Arc" };

const pretty = (map: Record<string, string>, id: string) => map[id] ?? id.replace(/-/g, " ");
const usd = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const apr = (n: number) => `${n.toFixed(2)}%`;

const SHOW = 6;

/** Live borrow rates for the landing: the same tool output the agent reasons over, arranged so a human can read the decision. */
export function LiveRates() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [all, setAll] = useState(false);

  useEffect(() => {
    fetch("/api/markets?amountUsdc=100")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw new Error(j.error ?? r.statusText);
        return j as Markets;
      })
      .then((data) => setState({ kind: "ok", data, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))
      .catch((e) => setState({ kind: "error", message: (e as Error).message }));
  }, []);

  if (state.kind === "loading") {
    return (
      <Card padding="lg" className="animate-pulse text-lg text-fg/60" aria-busy="true">
        asking The Graph for live USDC borrow rates…
      </Card>
    );
  }
  if (state.kind === "error") {
    return (
      <Card tone="warn" padding="lg" className="text-lg">
        Rates unavailable right now — the console still works. <span className="text-base text-fg/60">({state.message})</span>
      </Card>
    );
  }

  const { data } = state;
  const rows = [...data.table].sort((a, b) => a.borrowAprPct - b.borrowAprPct);
  const maxApr = Math.max(...rows.map((r) => r.borrowAprPct), 0.01);
  const pick = rows.find((r) => r.venueId === data.recommended) ?? null;
  const cheapest = rows.find((r) => r.venueId === data.cheapestMainnet) ?? null;
  const visible = all ? rows : rows.slice(0, SHOW);
  const hidden = rows.length - visible.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_19rem] md:items-start">
        {/* ── Ladder ─────────────────────────────────────────────────────── */}
        <Card padding="sm" as="section" aria-label="USDC borrow rates, cheapest first">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1 font-heading text-sm uppercase tracking-wide text-fg/60">
            <span>Venue · cheapest first</span>
            <span>Borrow APR</span>
          </div>
          <ol className="divide-y-2 divide-dashed divide-fg/20">
            {visible.map((r, i) => {
              const isPick = r.venueId === data.recommended;
              const executable = !!r.executableOn;
              return (
                <li key={r.venueId + r.market} title={r.market} className={cx("flex items-center gap-3 px-1 py-2.5", isPick && "-mx-1 bg-ink/10 px-2 wobbly-sm")}>
                  <span className={cx("hidden w-6 shrink-0 text-center font-heading text-base sm:inline", isPick ? "text-ink" : "text-fg/40")}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cx("font-heading text-lg leading-tight", isPick && "text-ink")}>{pretty(PROTOCOL, r.protocol)}</span>
                      <Pill tone={executable ? "ok" : "muted"} filled={isPick}>{pretty(NETWORK, r.network)}</Pill>
                      {isPick && (
                        <Pill tone="ok" filled>
                          <Check size={12} strokeWidth={3} aria-hidden="true" /> executes here
                        </Pill>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-3 flex-1 border-2 border-fg/60 bg-card wobbly-sm" aria-hidden="true">
                        <div
                          className={cx("h-full wobbly-sm transition-[width] duration-500", isPick ? "bg-ink" : "bg-fg/25")}
                          style={{ width: `${Math.max(4, (r.borrowAprPct / maxApr) * 100)}%` }}
                        />
                      </div>
                      <span className="hidden text-sm text-fg/50 tabular-nums sm:inline">{usd(r.availableUsd)} free · {Math.round(r.utilizationPct)}% used</span>
                    </div>
                  </div>
                  <span className={cx("w-20 shrink-0 text-right font-heading text-xl tabular-nums", isPick ? "text-ink" : "text-fg")}>{apr(r.borrowAprPct)}</span>
                </li>
              );
            })}
          </ol>
          {rows.length > SHOW && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)} aria-expanded={all}>
                <ChevronDown size={16} strokeWidth={3} className={cx("transition-transform", all && "rotate-180")} aria-hidden="true" />
                {all ? "show fewer" : `show ${hidden} more venues`}
              </Button>
            </div>
          )}
        </Card>

        {/* ── Agent's pick ───────────────────────────────────────────────── */}
        {pick ? (
          <Card tone="postit" decoration="tack" as="aside" aria-label="The agent's pick">
            <Sticky tone="ok" rotate={-1} className="mb-4 text-sm">agent&apos;s pick</Sticky>
            <h3 className="font-heading text-2xl leading-tight">{pretty(PROTOCOL, pick.protocol)}</h3>
            <p className="text-base text-fg/70">on {pretty(NETWORK, pick.network)}</p>
            <p className="mt-3 font-heading text-5xl leading-none tabular-nums text-ink">{apr(pick.borrowAprPct)}</p>
            <p className="mb-4 text-sm uppercase tracking-wide text-fg/60">borrow APR · {usd(pick.availableUsd)} available</p>
            <ul className="space-y-1.5 text-base">
              {[
                `Executes on ${pretty(NETWORK, pick.executableOn ?? pick.network)}`,
                "Lends real Circle USDC",
                "Bridges to Arc via CCTP in ~8s",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check size={18} strokeWidth={3} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            {cheapest && cheapest.venueId !== pick.venueId && (
              <p className="mt-4 border-t-2 border-dashed border-fg/40 pt-3 text-sm text-fg/70">
                Cheapest on mainnet is {pretty(PROTOCOL, cheapest.protocol)} · {pretty(NETWORK, cheapest.network)} at {apr(cheapest.borrowAprPct)}, but it has no testnet twin to execute on.
              </p>
            )}
          </Card>
        ) : (
          <Card tone="warn" as="aside" className="text-base">
            <AlertTriangle size={20} strokeWidth={2.75} className="mb-2 text-fg" aria-hidden="true" />
            No venue can execute this amount right now. The agent would refuse rather than guess.
          </Card>
        )}
      </div>

      {/* ── Footer: provenance + caveats ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-fg/60">
        <span>fetched {state.at} · The Graph standardized subgraphs</span>
        <span className="inline-flex items-center gap-1">mainnet rates inform <ArrowRight size={14} strokeWidth={3} aria-hidden="true" /> testnet twins execute</span>
      </div>
      {data.warnings?.length > 0 && (
          <details className="group text-base text-fg/60">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 underline decoration-dashed underline-offset-4 hover:text-fg">
              <AlertTriangle size={14} strokeWidth={3} aria-hidden="true" />
              {data.warnings.length} data caveat{data.warnings.length > 1 ? "s" : ""}
              <ChevronDown size={14} strokeWidth={3} className="transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ul className="mt-2 max-w-3xl space-y-1 border-2 border-fg bg-postit p-3 wobbly-sm text-sm text-fg">
              {data.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </details>
      )}
    </div>
  );
}
