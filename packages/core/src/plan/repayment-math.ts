/**
 * Pure arithmetic for the repayment recipe: how much to repay and how much (if anything) to bridge back from Arc,
 * given what the account actually holds. Amounts are USDC in 6-decimal units.
 */
export interface RepaymentInput { requested: bigint; debt: bigint; baseUsdc: bigint; arcUsdc: bigint }
export interface RepaymentSplit {
  /** USDC repaid into Compound on Base. */
  repayAmt: bigint;
  /** USDC burned on Arc for a mint on Base before repaying; 0n when Base already holds enough. */
  bridgeAmt: bigint;
  /** Set when the plan repays less than requested (insufficient USDC across both chains). */
  note?: string;
}

const fmt = (v: bigint) => (Number(v) / 1e6).toFixed(2);
const min = (a: bigint, b: bigint) => (a < b ? a : b);
/** Headroom for the CCTP fee so the mint on Base covers what is needed even at the burn's maxFee (1%, floor 100). */
const feeBuffer = (x: bigint) => (x / 100n > 100n ? x / 100n : 100n);
/** What a burn of `arc` USDC is guaranteed to deliver on Base after the worst-case fee. */
const deliverable = (arc: bigint) => (arc > feeBuffer(arc) ? arc - feeBuffer(arc) : 0n);
const MIN_REPAY = 10_000n; // 0.01 USDC: below this there is nothing meaningful to repay

export function splitRepayment(i: RepaymentInput): RepaymentSplit {
  if (i.debt <= 0n) throw new Error("no Compound debt to repay");
  const wanted = min(i.requested, i.debt);
  if (wanted <= i.baseUsdc) return { repayAmt: wanted, bridgeAmt: 0n };

  const needed = wanted - i.baseUsdc;
  const bridge = needed + feeBuffer(needed);
  if (bridge <= i.arcUsdc) return { repayAmt: wanted, bridgeAmt: bridge };

  // Not enough across both chains: repay what can actually be assembled and say so.
  const fromArc = deliverable(i.arcUsdc);
  const maxRepay = i.baseUsdc + fromArc;
  if (maxRepay < MIN_REPAY) throw new Error(`no USDC available to repay: Base ${fmt(i.baseUsdc)}, Arc ${fmt(i.arcUsdc)} (need ${fmt(wanted)})`);
  const note = `Requested ${fmt(wanted)} USDC but only ${fmt(maxRepay)} is available (Base ${fmt(i.baseUsdc)}, Arc ${fmt(i.arcUsdc)} after bridge fee); repaying ${fmt(maxRepay)}.`;
  if (fromArc < MIN_REPAY) return { repayAmt: i.baseUsdc, bridgeAmt: 0n, note };
  return { repayAmt: maxRepay, bridgeAmt: i.arcUsdc, note };
}
