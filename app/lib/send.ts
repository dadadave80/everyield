import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";
import { formatUnits } from "ethers";
import { handleEIP7702Authorizations } from "@/lib/eip7702";

export type SignMessageFn = (
  params: { message: string },
  options: { uiOptions: { title: string }; address: string },
) => Promise<{ signature: string }>;

export type SignAuthorizationFn = (
  params: { contractAddress: `0x${string}`; chainId: number; nonce: number },
  options: { address: string },
) => Promise<{ r: string; s: string; v?: bigint; yParity: number }>;

/** Live journey of an in-flight or historical action. */
export type ActivityStage =
  | "signing"
  | "signed"
  | "routing"
  | "executing"
  | "delayed"
  | "confirmed"
  | "failed";

/** The four milestones the progress rail renders, in order. */
export const STAGE_STEPS = ["signed", "routing", "executing", "confirmed"] as const;

export interface LocalActivity {
  id: string;
  kind: "save" | "withdraw";
  amountLabel: string;
  stage: ActivityStage;
  transactionId?: string;
  createdAt: number;
}

export interface SendArgs {
  kind: "save" | "withdraw";
  transaction: ITransaction;
  amountLabel: string;
  title: string;
}

interface RunSendArgs {
  ua: UniversalAccount;
  transaction: ITransaction;
  walletAddress: string;
  signMessage: SignMessageFn;
  signAuthorization: SignAuthorizationFn;
  title: string;
  onStage?: (stage: ActivityStage) => void;
}

/**
 * The scaffold's exact 4-step Universal Account send, reused verbatim for both
 * Save (deposit) and Withdraw (redeem):
 *   1. resolve EIP-7702 authorizations for the userOps
 *   2. sign the transaction root hash
 *   3. submit via universalAccount.sendTransaction
 * Returns the Particle transactionId.
 */
export async function runSend({
  ua,
  transaction,
  walletAddress,
  signMessage,
  signAuthorization,
  title,
  onStage,
}: RunSendArgs): Promise<string> {
  onStage?.("signing");

  const authorizations = await handleEIP7702Authorizations(
    transaction.userOps,
    signAuthorization,
    walletAddress,
  );

  const { signature } = await signMessage(
    { message: transaction.rootHash },
    { uiOptions: { title }, address: walletAddress },
  );

  onStage?.("signed");

  const sendResult = await ua.sendTransaction(transaction, signature, authorizations);

  return sendResult.transactionId || "";
}

// SDK 2.x reports fee totals as 1e18-scaled hex strings (e.g. "0x6a17d8fa8c03c0"
// == $0.0298), not plain decimal strings — decode both forms. Validate the hex
// shape before parsing: BigInt() throws SyntaxError on "0x" or "0xzz", and a
// case-sensitive "0x" check lets "0X…" fall through to Number(), which parses
// hex natively and reproduces the misrender this decode exists to prevent.
export const usdAmount = (v?: string | null): number => {
  if (!v) return 0;
  if (/^0x[0-9a-f]+$/i.test(v)) return Number(formatUnits(BigInt(v), 18));
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// A confirm-time rebuild's fee is only surfaced for a required re-click when it
// diverges meaningfully from the debounced preview shown pre-click — routine
// SDK-quote jitter between the two builds shouldn't force an extra click.
const FEE_DRIFT_PCT = 0.2;
const FEE_DRIFT_ABS_USD = 0.25;

/** Whether a freshly rebuilt fee total diverges enough from the displayed preview to require re-confirmation. */
export function feeDrifted(previousTotal: number, freshTotal: number): boolean {
  return Math.abs(freshTotal - previousTotal) > Math.max(previousTotal * FEE_DRIFT_PCT, FEE_DRIFT_ABS_USD);
}

// Particle's observed fee for a deposit/withdraw is ~$0.14 — reserving a
// multiple of that means the Max chip never lands the unified balance at
// zero headroom for its own next network fee (the deposit-then-can't-withdraw
// trap this constant exists to prevent).
export const FEE_HEADROOM_USD = 0.5;

// The exact substring `ua.createUniversalTransaction` throws when the unified
// balance can't cover the transaction's own network fee — the one quote/build
// failure whose cause is actually knowable, so it's worth naming specifically
// instead of folding it into the generic "couldn't check the cost" copy.
const INSUFFICIENT_FEE_RE = /insufficient balance for gas fees/i;

export type QuoteErrorKind = "insufficient-fee" | "generic";

/** Classifies a quote/build failure message so preview and confirm error
 * states can show honest, specific copy for the one knowable cause — the
 * amount the user typed is irrelevant when this is why it failed. */
export function classifyQuoteError(message: string | null | undefined): QuoteErrorKind {
  return message && INSUFFICIENT_FEE_RE.test(message) ? "insufficient-fee" : "generic";
}

/** Shown instead of the generic preview/build failure copy when {@link classifyQuoteError} returns `"insufficient-fee"`. */
export const INSUFFICIENT_FEE_MESSAGE =
  "Your balance can't cover the network fee (~$0.15). Add a little USDC or ETH on any chain — your savings are safe and withdrawable the moment it arrives.";

/** Extracts a printable message from a caught value of unknown shape. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Honest cost preview pulled straight from the transaction's fee quote. */
export function readFeePreview(transaction: ITransaction): {
  total: number;
  routing: number;
  gas: number;
} | null {
  const totals = transaction.feeQuotes?.[0]?.fees?.totals;
  if (!totals) return null;
  // feeTokenAmountInUSD is the ALL-IN fee; gasFeeTokenAmountInUSD is the gas
  // portion already included within it — so routing = total - gas, never total + gas.
  // This "gas is a subset of total" reading is inferred from a live sample, not
  // documented by the SDK (it passes these fields through untouched); warn if a
  // live quote ever contradicts it so the clamp below doesn't silently hide it.
  const total = usdAmount(totals.feeTokenAmountInUSD);
  const gas = usdAmount(totals.gasFeeTokenAmountInUSD);
  if (gas > total) {
    console.warn(`readFeePreview: gas (${gas}) exceeds total (${total}) — fees may be additive, not inclusive`);
  }
  return { total, routing: Math.max(total - gas, 0), gas };
}
