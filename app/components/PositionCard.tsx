"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, parseUnits } from "ethers";
import { ArrowUpRight } from "lucide-react";
import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";
import type { Position } from "@/lib/everyield";
import { createWithdrawTx } from "@/lib/everyield";
import {
  classifyQuoteError,
  errorMessage,
  feeDrifted,
  INSUFFICIENT_FEE_MESSAGE,
  readFeePreview,
  type SendArgs,
} from "@/lib/send";
import { formatUsd, splitUsd, useCountUp, useDebounced } from "@/lib/ui";
import { FeePreview } from "@/components/FeePreview";
import { OptimizingNotice } from "@/components/OptimizingNotice";

interface PositionCardProps {
  ua: UniversalAccount | null;
  owner: string;
  position: Position | null;
  apy: number | null;
  loading: boolean;
  busy: boolean;
  onSend: (args: SendArgs) => Promise<void>;
}

// USD amount → vault shares to redeem. Within $0.01 of the full balance we
// redeem ALL shares (never strand a dust remainder); otherwise shares =
// amount6 * totalSupply / totalAssets, clamped to what the owner actually holds.
function sharesForAmount(
  amountStr: string,
  full: number,
  ownerShares: bigint,
  totalAssets: bigint,
  totalSupply: bigint,
): bigint {
  const numeric = parseFloat(amountStr);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0n;
  if (Math.abs(numeric - full) <= 0.01) return ownerShares;
  if (totalAssets === 0n) return ownerShares;
  const amount6 = parseUnits(numeric.toFixed(2), 6);
  const shares = (amount6 * totalSupply) / totalAssets;
  return shares > ownerShares ? ownerShares : shares;
}

export function PositionCard({
  ua,
  owner,
  position,
  apy,
  loading,
  busy,
  onSend,
}: PositionCardProps) {
  const [mode, setMode] = useState<"idle" | "confirm">("idle");
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<ITransaction | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A fresh transaction rebuilt at confirm time whose fee drifted enough from
  // the displayed preview to require a second click. Consent-state only — it is
  // never itself signed; confirm always rebuilds again before sending.
  const [confirmTx, setConfirmTx] = useState<ITransaction | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const debounced = useDebounced(amount, 450);
  const previewSeq = useRef(0);

  const value = position ? Number(position.display) : 0;
  const animatedValue = useCountUp(value);
  const { dollars, cents } = splitUsd(animatedValue);
  const hasSavings = !!position && position.shares > 0n;
  // Fail closed pre-first-read (see SaveCard); unreachable today since
  // `hasSavings` already requires a resolved `position`, but kept symmetric.
  const fullyIdle = position?.fullyIdle ?? false;
  const checkingStatus = position === null;

  // Primitive holdings — used as effect deps so a 15s position poll that returns
  // identical numbers doesn't rebuild the preview (Object.is-stable, unlike the
  // fresh `position` object identity each poll hands back).
  const ownerShares = position?.shares ?? 0n;
  const totalAssets = position?.totalAssets ?? 0n;
  const totalSupply = position?.totalSupply ?? 0n;

  const numeric = parseFloat(amount);
  const validNumber = Number.isFinite(numeric) && numeric > 0;
  const overBalance = validNumber && numeric > value + 0.01;
  const fee = tx ? readFeePreview(tx) : null;
  const settledPreview = previewing || debounced !== amount;

  // Debounced fee preview: convert the amount to shares, build the redeem tx,
  // read its quote (mirrors SaveCard). Only while the confirm sheet is open.
  useEffect(() => {
    const d = parseFloat(debounced);
    if (mode !== "confirm" || !ua || !owner || !Number.isFinite(d) || d <= 0 || d > value + 0.01) {
      setTx(null);
      setPreviewing(false);
      return;
    }
    const shares = sharesForAmount(debounced, value, ownerShares, totalAssets, totalSupply);
    if (shares <= 0n) {
      setTx(null);
      setPreviewing(false);
      return;
    }
    const seq = ++previewSeq.current;
    setPreviewing(true);
    setError(null);
    (async () => {
      try {
        const built = await createWithdrawTx(ua, shares, owner);
        if (seq === previewSeq.current) setTx(built as ITransaction);
      } catch (e) {
        console.error("withdraw preview failed", e);
        if (seq === previewSeq.current) {
          setTx(null);
          setError(
            classifyQuoteError(errorMessage(e)) === "insufficient-fee"
              ? INSUFFICIENT_FEE_MESSAGE
              : "Couldn't check the cost just now. Adjust the amount to retry.",
          );
        }
      } finally {
        if (seq === previewSeq.current) setPreviewing(false);
      }
    })();
  }, [debounced, mode, value, ownerShares, totalAssets, totalSupply, ua, owner]);

  // Any edit to the amount invalidates a fresh tx awaiting a fee-drift
  // re-confirm — never sign a stale amount's transaction.
  useEffect(() => {
    setConfirmTx(null);
  }, [amount]);

  const openWithdraw = () => {
    if (!position || position.shares <= 0n) return;
    setError(null);
    setConfirmTx(null);
    setTx(null);
    setAmount(value.toFixed(2)); // default = full balance
    setMode("confirm");
  };

  const confirmWithdraw = async () => {
    if (!position || !ua || !owner || !validNumber || overBalance) return;
    const shares = sharesForAmount(amount, value, position.shares, position.totalAssets, position.totalSupply);
    if (shares <= 0n) return;
    setError(null);
    setRebuilding(true);
    try {
      // Rebuild fresh at every click — the cached confirmTx is consent-state
      // only and is never itself signed (Particle's pending-tx record has a
      // short TTL). The re-confirm after a drift warning rebuilds again here.
      const fresh = (await createWithdrawTx(ua, shares, owner)) as ITransaction;
      const freshFee = readFeePreview(fresh);
      // Fail closed: never sign with an unknown cost.
      if (!freshFee) {
        setTx(null);
        setConfirmTx(null);
        setError("Couldn't check the cost just now. Adjust the amount to retry.");
        return;
      }
      // First click (no prior consent) that drifts → surface the new cost and
      // require a second click; the second click still signs a fresh rebuild.
      if (!confirmTx && fee && feeDrifted(fee.total, freshFee.total)) {
        setTx(fresh);
        setConfirmTx(fresh);
        return;
      }
      setConfirmTx(null);
      await onSend({
        kind: "withdraw",
        transaction: fresh,
        amountLabel: formatUsd(numeric),
        title: `Withdraw ${formatUsd(numeric)} from Everyield savings`,
      });
      setMode("idle");
      setAmount("");
      setTx(null);
    } catch (e) {
      setConfirmTx(null);
      setError(
        classifyQuoteError(errorMessage(e)) === "insufficient-fee"
          ? INSUFFICIENT_FEE_MESSAGE
          : "That didn't go through. Nothing was moved — you can retry.",
      );
    } finally {
      setRebuilding(false);
    }
  };

  const cancel = () => {
    setMode("idle");
    setAmount("");
    setTx(null);
    setConfirmTx(null);
    setError(null);
  };

  return (
    <section className="ey-rise card-shadow rounded-3xl border border-line bg-surface p-6" style={{ animationDelay: "120ms" }}>
      <div className="flex items-start justify-between">
        <p className="font-display text-lg italic text-ink-soft">Your savings</p>
        <ApyBadge apy={apy} />
      </div>

      <div className="mt-3">
        {loading && !position ? (
          <div className="ey-shimmer h-11 w-40 rounded-lg" />
        ) : (
          <p className="font-display text-5xl leading-none tracking-[-0.02em] tnum text-ink">
            {dollars}
            <span className="text-2xl text-ink-faint">{cents}</span>
          </p>
        )}
        <p className="mt-2 text-[13px] text-ink-faint">
          {hasSavings
            ? `${Number(formatUnits(position!.shares, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 })} shares · earning around the clock`
            : "You haven't started saving yet — add some below."}
        </p>
      </div>

      {hasSavings && (
        <div className="mt-5">
          {!fullyIdle ? (
            <OptimizingNotice action="withdraw" checking={checkingStatus} />
          ) : mode === "idle" ? (
            <button
              type="button"
              onClick={openWithdraw}
              disabled={busy}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Withdraw
              <ArrowUpRight className="size-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-line bg-field px-5 py-4 focus-within:border-accent/60">
                <label className="flex items-center gap-1">
                  <span className="text-3xl font-light text-ink-faint">$</span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Amount to withdraw"
                    value={amount}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
                    }}
                    className="w-full bg-transparent text-4xl font-light tnum text-ink outline-none placeholder:text-ink-faint/60 disabled:opacity-50"
                  />
                </label>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[13px] text-ink-faint">{formatUsd(value)} saved</span>
                  <button
                    type="button"
                    disabled={busy || value <= 0}
                    onClick={() => setAmount(value.toFixed(2))}
                    className="rounded-full border border-line px-2.5 py-1 text-xs text-accent transition-colors hover:bg-surface-2 disabled:opacity-40"
                  >
                    Max
                  </button>
                </div>
              </div>
              {overBalance ? (
                <p className="text-[13px] text-danger">That&apos;s more than your savings balance.</p>
              ) : (
                validNumber && <FeePreview fee={fee} loading={settledPreview} />
              )}
              {confirmTx && (
                <p className="text-[13px] text-ink-soft">
                  The cost changed since you last checked — review above and tap confirm again.
                </p>
              )}
              {error && <p className="text-[13px] text-danger">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="h-11 flex-1 rounded-full border border-line text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-50"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={confirmWithdraw}
                  disabled={busy || previewing || rebuilding || !tx || settledPreview || overBalance || !validNumber}
                  className="h-11 flex-[1.4] rounded-full bg-accent text-sm font-medium text-accent-ink outline-none transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {rebuilding
                    ? "Checking…"
                    : busy
                      ? "Withdrawing…"
                      : confirmTx
                        ? "Confirm at updated cost"
                        : "Confirm withdrawal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ApyBadge({ apy }: { apy: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent">
      <span className="relative grid size-2 place-items-center">
        <span className="absolute size-2 rounded-full bg-accent ey-breathe" />
      </span>
      {apy == null ? "Live yield" : `${apy.toFixed(2)}% a year`}
    </span>
  );
}
