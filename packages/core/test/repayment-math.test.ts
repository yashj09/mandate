import { describe, expect, it } from "vitest";
import { splitRepayment } from "../src/plan/repayment-math.ts";

const u = (n: number) => BigInt(Math.round(n * 1e6));

describe("splitRepayment", () => {
  it("repays from Base when Base holds enough", () => {
    expect(splitRepayment({ requested: u(10), debt: u(73), baseUsdc: u(12), arcUsdc: u(30) })).toEqual({ repayAmt: u(10), bridgeAmt: 0n });
  });
  it("caps at the debt", () => {
    expect(splitRepayment({ requested: u(500), debt: u(73), baseUsdc: u(100), arcUsdc: 0n })).toEqual({ repayAmt: u(73), bridgeAmt: 0n });
  });
  it("bridges the shortfall from Arc with fee headroom", () => {
    const r = splitRepayment({ requested: u(10), debt: u(73), baseUsdc: u(2), arcUsdc: u(29.99) });
    expect(r.repayAmt).toBe(u(10));
    expect(r.bridgeAmt).toBe(u(8) + u(0.08)); // 8 needed + 1% buffer
    expect(r.note).toBeUndefined();
  });
  it("uses the 100-unit fee floor for tiny bridges", () => {
    const r = splitRepayment({ requested: u(2.005), debt: u(73), baseUsdc: u(2), arcUsdc: u(30) });
    expect(r.bridgeAmt).toBe(5_000n + 100n);
  });
  it("repays what is available across both chains when the request exceeds it, and says so", () => {
    // The failure seen on Sept 13: 73 requested, 2 on Base, 29.99 on Arc.
    const r = splitRepayment({ requested: u(73), debt: u(73), baseUsdc: u(2), arcUsdc: u(29.99) });
    expect(r.bridgeAmt).toBe(u(29.99));
    expect(r.repayAmt).toBe(u(2) + (u(29.99) - u(29.99) / 100n));
    expect(r.note).toMatch(/Requested 73.00 USDC but only 31.69 is available/);
  });
  it("ignores Arc dust that a bridge fee would consume", () => {
    const r = splitRepayment({ requested: u(10), debt: u(73), baseUsdc: u(2), arcUsdc: 50n });
    expect(r).toMatchObject({ repayAmt: u(2), bridgeAmt: 0n });
    expect(r.note).toBeDefined();
  });
  it("throws when nothing can be repaid", () => {
    expect(() => splitRepayment({ requested: u(10), debt: u(73), baseUsdc: 0n, arcUsdc: 50n })).toThrow(/no USDC available/);
    expect(() => splitRepayment({ requested: u(10), debt: 0n, baseUsdc: u(5), arcUsdc: 0n })).toThrow(/no Compound debt/);
  });
});
