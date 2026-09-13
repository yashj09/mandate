"use client";
import { useEffect, useState } from "react";
import { Bot, Check, CheckCircle2, FileSignature, Fingerprint, Hand, type LucideIcon } from "lucide-react";
import { Card, Mono, Pill } from "@/components/ui";
import { cx } from "@/lib/sketch";

/** One beat every 1.4s; five beats ≈ 7s per loop. */
const STEP_MS = 1400;

type Beat = { icon: LucideIcon; title: string; detail: string; /** irreversible: the agent must stop here */ gate?: boolean };

const BEATS: Beat[] = [
  { icon: FileSignature, title: "You set a mandate", detail: "$100 / tx · $500 / day · 7 days · signed by you" },
  { icon: Bot, title: "The agent borrows on its own", detail: "wrap → supply → borrow 100 USDC · reversible" },
  { icon: Hand, title: "Stops before the bridge", detail: "a CCTP burn can't be undone", gate: true },
  { icon: Fingerprint, title: "Your Ledger shows the text", detail: "plain words, clear-signed" },
  { icon: CheckCircle2, title: "Tap. Settled on Arc.", detail: "100 USDC to the payee in ~8s" },
];

/* Same line labels as MandateAccount.approvalText; hashes shortened for the sketch. */
const APPROVAL = `Mandate approval
Chain: 84532
Step: 4
Max USDC out: 100.00
Calls: 0x7c1e…9b2f
Nonce: 7`;

type NodeState = "done" | "active" | "todo";

/* Hand-drawn vertical connector: faint dashed guide + a pen stroke drawn over it. */
function Connector({ state }: { state: NodeState }) {
  const d = "M12 0 C 15 12, 9 24, 12 40";
  return (
    <svg viewBox="0 0 24 40" preserveAspectRatio="none" className="h-8 w-6" aria-hidden="true">
      <path d={d} pathLength={100} strokeDasharray="7 5" strokeWidth={3} strokeLinecap="round" className="fill-none stroke-fg/30" />
      {state !== "todo" && (
        <path
          key={state}
          d={d}
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={state === "done" ? 0 : undefined}
          strokeWidth={3}
          strokeLinecap="round"
          className={cx("fill-none", state === "active" ? "stroke-accent animate-draw" : "stroke-ink")}
        />
      )}
    </svg>
  );
}

/**
 * Live storyboard of one intent: mandate → autonomous borrow → hard stop → Ledger clear-sign → settlement.
 * Auto-advances; hover/focus pauses; every node is a button so keyboard and reduced-motion users can step manually.
 */
export function FlowBoard({ className }: { className?: string }) {
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => setPhase((p) => (p + 1) % BEATS.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced]);

  const last = BEATS.length - 1;

  return (
    <Card
      decoration="tape"
      padding="md"
      role="group"
      aria-label="Live run of one intent, start to finish"
      className={cx("w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 whitespace-nowrap font-heading text-sm uppercase tracking-wide">
          <span className="relative inline-flex h-3 w-3" aria-hidden="true">
            {!reduced && <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />}
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-fg bg-accent" />
          </span>
          live run
        </span>
        <Mono tone="muted" className="whitespace-nowrap text-xs">plan 0042 · base → arc</Mono>
      </div>

      <ol className="relative">
        {BEATS.map((b, i) => {
          const state: NodeState = i < phase || (i === last && phase === last) ? "done" : i === phase ? "active" : "todo";
          const isActive = i === phase;
          const Glyph = b.icon;
          return (
            <li key={b.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setPhase(i)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${i + 1} of ${BEATS.length}: ${b.title}`}
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center border-[3px] wobbly-pill transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                    isActive
                      ? b.gate
                        ? "-translate-y-0.5 scale-110 border-fg bg-accent text-white shadow-sketch-sm"
                        : "-translate-y-0.5 scale-110 border-fg bg-postit text-fg shadow-sketch-sm"
                      : state === "done"
                        ? "border-ink bg-card text-ink"
                        : "border-dashed border-fg/40 bg-card text-fg/40",
                  )}
                >
                  {state === "done" && !isActive ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <Glyph size={18} strokeWidth={2.75} aria-hidden="true" />}
                </button>
                {i < last && <Connector state={i < phase ? "done" : isActive ? "active" : "todo"} />}
              </div>

              <div className={cx("min-w-0 flex-1 pt-1.5", i < last ? "pb-3" : "pb-0")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx("font-heading text-lg leading-tight transition-colors duration-200", state === "todo" ? "text-fg/40" : "text-fg")}>
                    {b.title}
                  </span>
                  {isActive && b.gate && (
                    <Pill tone="warn" className="animate-pop">
                      <Fingerprint size={12} strokeWidth={3} aria-hidden="true" /> needs you
                    </Pill>
                  )}
                  {isActive && i === last && (
                    <Pill tone="ok" filled className="animate-pop">
                      <Check size={12} strokeWidth={3} aria-hidden="true" /> 0x8f3a…c21e
                    </Pill>
                  )}
                </div>
                <div className={cx("text-base transition-colors duration-200", state === "todo" ? "text-fg/30" : "text-fg/70")}>{b.detail}</div>
                {i === 3 && (
                  <pre
                    aria-hidden={phase < 3}
                    className={cx(
                      "mt-2 whitespace-pre-wrap border-2 border-dashed bg-card p-2 wobbly-sm font-mono text-xs leading-snug tracking-tight transition-all duration-300",
                      phase < 3 ? "border-fg/40 text-fg/40 blur-[1.5px]" : "border-ink text-fg",
                    )}
                  >
                    {APPROVAL}
                  </pre>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-fg/60">
        <div className="flex gap-1.5" aria-hidden="true">
          {BEATS.map((b, i) => (
            <span key={b.title} className={cx("h-2.5 w-5 border-2 border-fg wobbly-sm transition-colors duration-200", i <= phase ? "bg-ink" : "bg-card")} />
          ))}
        </div>
        <span>{reduced ? "click a step" : paused ? "paused" : "hover to pause"}</span>
      </div>
    </Card>
  );
}
