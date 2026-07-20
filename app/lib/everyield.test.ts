import { describe, expect, it } from "bun:test";
import { Interface, parseUnits } from "ethers";
import { createWithdrawTx, encodeDeposit } from "./everyield";
import { ARBITRUM_USDC, VAULT } from "./addresses";

describe("encodeDeposit", () => {
  it("batches approve(vault, amt) then deposit(amt, owner)", () => {
    const owner = "0x000000000000000000000000000000000000dEaD";
    const [approve, deposit] = encodeDeposit("12.5", owner);
    expect(approve.to).toBe(ARBITRUM_USDC);
    expect(deposit.to).toBe(VAULT);
    const dec = new Interface(["function deposit(uint256,address)"]).decodeFunctionData(
      "deposit",
      deposit.data,
    );
    expect(dec[0]).toBe(parseUnits("12.5", 6));
    expect(dec[1].toLowerCase()).toBe(owner.toLowerCase());
  });
});

describe("createWithdrawTx", () => {
  it("encodes redeem(shares, owner, owner)", async () => {
    const owner = "0x000000000000000000000000000000000000dEaD";
    const shares = parseUnits("3.25", 6);
    // ua is never called (no network transaction is created here) — only its
    // createUniversalTransaction call args are inspected, so a minimal stub suffices.
    let capturedTransactions: { to: string; data: string }[] | undefined;
    const ua = {
      createUniversalTransaction: async (payload: {
        transactions: { to: string; data: string }[];
      }) => {
        capturedTransactions = payload.transactions;
        return payload;
      },
    } as any;

    await createWithdrawTx(ua, shares, owner);

    expect(capturedTransactions).toBeDefined();
    const [redeemTx] = capturedTransactions!;
    expect(redeemTx.to).toBe(VAULT);

    const dec = new Interface([
      "function redeem(uint256,address,address)",
    ]).decodeFunctionData("redeem", redeemTx.data);

    expect(dec[0]).toBe(shares);
    expect(dec[1].toLowerCase()).toBe(owner.toLowerCase());
    expect(dec[2].toLowerCase()).toBe(owner.toLowerCase());
  });
});
