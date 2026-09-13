import { describe, expect, it } from "vitest";
import { encodeErrorResult, parseAbi } from "viem";
import { MandateAccountAbi } from "../src/abi/MandateAccount.ts";
import { decodeRevertData, describeInnerRevert } from "../src/errors.ts";

describe("revert decoding", () => {
  it("names the inner ERC-20 error inside CallFailed", () => {
    const inner = encodeErrorResult({ abi: parseAbi(["error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)"]), errorName: "ERC20InsufficientBalance", args: ["0x0000000000000000000000000000000000000001", 2_000000n, 73_007631n] });
    const outer = encodeErrorResult({ abi: MandateAccountAbi, errorName: "CallFailed", args: [1n, inner] });
    const e = decodeRevertData(outer)!;
    expect(e.code).toBe("CallFailed");
    expect(e.message).toBe("CallFailed(call 1: ERC20InsufficientBalance(0x0000000000000000000000000000000000000001, 2000000, 73007631))");
  });
  it("decodes Error(string) and empty reverts", () => {
    const inner = encodeErrorResult({ abi: parseAbi(["error Error(string)"]), errorName: "Error", args: ["transfer amount exceeds balance"] });
    expect(describeInnerRevert(inner)).toBe("Error(transfer amount exceeds balance)");
    expect(describeInnerRevert("0x")).toMatch(/empty revert/);
  });
  it("still decodes plain account errors", () => {
    const data = encodeErrorResult({ abi: MandateAccountAbi, errorName: "PerTxCapExceeded", args: [5_000_000000n, 100_000000n] });
    expect(decodeRevertData(data)!.message).toBe("PerTxCapExceeded(5000000000, 100000000)");
  });
});
