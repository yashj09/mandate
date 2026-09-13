import { decodeErrorResult, parseAbi, type Hex } from "viem";
import { MandateAccountAbi } from "./abi/MandateAccount.ts";

/** Errors the account's inner calls commonly revert with (OpenZeppelin ERC-20, Compound v3 Comet). `Error(string)` and `Panic` are built in. */
const INNER_ERRORS_ABI = parseAbi([
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error ERC20InvalidReceiver(address receiver)",
  "error SafeERC20FailedOperation(address token)",
  "error TransferInFailed()",
  "error TransferOutFailed()",
  "error NotCollateralized()",
  "error BorrowTooSmall()",
  "error SupplyCapExceeded()",
  "error InsufficientReserves()",
  "error Paused()",
  "error Unauthorized()",
  "error BadAsset()",
  "error TooManyAssets()",
  "error NotLiquidatable()",
  "error TooMuchSlippage()",
]);

/** Human-readable form of raw revert data from an inner call (the `returndata` in `CallFailed`). */
export function describeInnerRevert(data: Hex | undefined): string {
  if (!data || data === "0x") return "empty revert (out of gas, or a call to a non-contract)";
  try {
    const d = decodeErrorResult({ abi: INNER_ERRORS_ABI, data });
    return `${d.errorName}(${(d.args ?? []).map(String).join(", ")})`;
  } catch {
    return `unknown error ${data.slice(0, 10)}`;
  }
}

/** Decodes revert data against the account ABI; `CallFailed` carries the inner call's reason. */
export function decodeRevertData(data: Hex | undefined): MandateError | null {
  if (!data || data === "0x") return null;
  try {
    const d = decodeErrorResult({ abi: MandateAccountAbi, data });
    const args = (d.args ?? []) as readonly unknown[];
    if (d.errorName === "CallFailed") {
      const [index, ret] = args as [bigint, Hex];
      return new MandateError(`CallFailed(call ${index}: ${describeInnerRevert(ret)})`, d.errorName, { args: args.map(String), index: Number(index), inner: describeInnerRevert(ret) });
    }
    return new MandateError(`${d.errorName}(${args.map(String).join(", ")})`, d.errorName, { args: args.map(String) });
  } catch {
    return null;
  }
}

export class MandateError extends Error {
  constructor(message: string, readonly code: string, readonly details?: Record<string, unknown>) { super(message); this.name = "MandateError"; }
}

/** Turns revert data (or an error carrying it) into a MandateError with the contract's custom error name as `code`. */
export function decodeMandateError(e: unknown): MandateError | null {
  return decodeRevertData(extractRevertData(e));
}

export function extractRevertData(e: any): Hex | undefined {
  let cur = e;
  for (let i = 0; i < 6 && cur; i++) {
    if (typeof cur.data === "string" && cur.data.startsWith("0x")) return cur.data as Hex;
    if (typeof cur.raw === "string" && cur.raw.startsWith("0x")) return cur.raw as Hex;
    cur = cur.cause;
  }
  return undefined;
}

/** Human-readable reason for any thrown error: decoded custom error when available, else the short message. */
export function describeError(e: unknown): string {
  return decodeMandateError(e)?.message ?? (e as any)?.shortMessage ?? (e as Error)?.message ?? String(e);
}
