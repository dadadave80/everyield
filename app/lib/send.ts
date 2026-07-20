import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";
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

/** Honest cost preview pulled straight from the transaction's fee quote. */
export function readFeePreview(transaction: ITransaction): {
  total: number;
  routing: number;
  gas: number;
} | null {
  const totals = transaction.feeQuotes?.[0]?.fees?.totals;
  if (!totals) return null;
  const routing = Number(totals.feeTokenAmountInUSD) || 0;
  const gas = Number(totals.gasFeeTokenAmountInUSD) || 0;
  // Brief specifies feeTokenAmountInUSD (+ gasFeeTokenAmountInUSD); surfaced as one
  // honest total with a routing/gas split. Live values calibrated in Task 9.
  return { total: routing + gas, routing, gas };
}
