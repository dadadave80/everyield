"use client";

import { useEffect, useRef, useState } from "react";
import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";
import { createDepositTx } from "@/lib/everyield";
import {
  classifyQuoteError,
  errorMessage,
  feeDrifted,
  FEE_HEADROOM_USD,
  INSUFFICIENT_FEE_MESSAGE,
  readFeePreview,
  type SendArgs,
} from "@/lib/send";
import { formatUsd, useDebounced } from "@/lib/ui";
import { FeePreview } from "@/components/FeePreview";
import { OptimizingNotice } from "@/components/OptimizingNotice";

interface SaveCardProps {
  ua: UniversalAccount | null;
  owner: string;
  available: number;
  fullyIdle: boolean;
  checkingStatus: boolean;
  busy: boolean;
  onSend: (args: SendArgs) => Promise<void>;
}

const QUICK = [25, 100, 500];

export function SaveCard({
  ua,
  owner,
  available,
  fullyIdle,
  checkingStatus,
  busy,
  onSend,
}: SaveCardProps) {
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<ITransaction | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A fresh transaction rebuilt at confirm time whose fee drifted enough from
  // the displayed preview to require a second click before it's signed.
  const [confirmTx, setConfirmTx] = useState<ITransaction | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const debounced = useDebounced(amount, 450);
  const previewSeq = useRef(0);

  const numeric = parseFloat(amount);
  const validNumber = Number.isFinite(numeric) && numeric > 0;
  // Reserve FEE_HEADROOM_USD off the top so Max — and any amount typed inside
  // that band — never leaves zero runway for this deposit's own network fee.
  const headroom = Math.max(available - FEE_HEADROOM_USD, 0);
  const overBalance = validNumber && numeric > headroom + 1e-9;
  // Distinguishes "genuinely more than you have" from "inside the fee
  // headroom" so the two get different, honest copy below.
  const trulyOverBalance = validNumber && numeric > available + 1e-9;
  const inFeeHeadroomZone = overBalance && !trulyOverBalance;
  const canPreview = validNumber && !overBalance && !!ua && !!owner && fullyIdle;

  // Debounced fee preview: build the deposit tx, read its quote, reuse it on confirm.
  useEffect(() => {
    const d = parseFloat(debounced);
    if (!Number.isFinite(d) || d <= 0 || d > headroom + 1e-9 || !ua || !owner || !fullyIdle) {
      setTx(null);
      setPreviewing(false);
      return;
    }
    const seq = ++previewSeq.current;
    setPreviewing(true);
    setError(null);
    (async () => {
      try {
        const built = await createDepositTx(ua, debounced, owner);
        if (seq === previewSeq.current) setTx(built as ITransaction);
      } catch (e) {
        console.error("deposit preview failed", e);
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
  }, [debounced, headroom, ua, owner, fullyIdle]);

  // Any edit to the amount invalidates a fresh tx awaiting a fee-drift
  // re-confirm — never sign a stale amount's transaction.
  useEffect(() => {
    setConfirmTx(null);
  }, [amount]);

  const fee = tx ? readFeePreview(tx) : null;
  const settledPreview = previewing || debounced !== amount;

  const save = async () => {
    if (!validNumber || overBalance || !ua || !owner) return;
    setError(null);
    setRebuilding(true);
    try {
      // Rebuild fresh at every click — Particle's server-side pending-tx record
      // has a short TTL, so the stored preview is display-only and the cached
      // confirmTx is consent-state only, never itself signed. The re-confirm
      // after a fee-drift warning rebuilds again here rather than signing cache.
      const fresh = (await createDepositTx(ua, amount, owner)) as ITransaction;
      const freshFee = readFeePreview(fresh);
      // Fail closed: never sign with an unknown cost — surface the same
      // couldn't-check-cost state the debounced preview uses.
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
        kind: "save",
        transaction: fresh,
        amountLabel: formatUsd(numeric),
        title: `Add ${formatUsd(numeric)} to Everyield savings`,
      });
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

  return (
    <section
      className="ey-rise card-shadow rounded-3xl border border-line bg-surface p-6"
      style={{ animationDelay: "220ms" }}
    >
      <p className="font-display text-lg italic text-ink-soft">Add to savings</p>

      <div className="mt-4 rounded-2xl border border-line bg-field px-5 py-4 focus-within:border-accent/60">
        <label className="flex items-center gap-1">
          <span className="text-3xl font-light text-ink-faint">$</span>
          <input
            inputMode="decimal"
            placeholder="0"
            aria-label="Amount to add to savings"
            value={amount}
            disabled={!fullyIdle || busy}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
            }}
            className="w-full bg-transparent text-4xl font-light tnum text-ink outline-none placeholder:text-ink-faint/60 disabled:opacity-50"
          />
        </label>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-ink-faint">
            {formatUsd(available)} available
          </span>
          <div className="flex gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                disabled={!fullyIdle || busy || q > available}
                onClick={() => setAmount(String(q))}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-40"
              >
                ${q}
              </button>
            ))}
            <button
              type="button"
              disabled={!fullyIdle || busy || headroom <= 0}
              onClick={() => setAmount(headroom.toFixed(2))}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-accent transition-colors hover:bg-surface-2 disabled:opacity-40"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {!fullyIdle ? (
        <div className="mt-4">
          <OptimizingNotice action="save" checking={checkingStatus} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {trulyOverBalance && (
            <p className="text-[13px] text-danger">That&apos;s more than your available money.</p>
          )}
          {inFeeHeadroomZone && (
            <p className="text-[13px] text-ink-soft">
              We keep ~$0.50 aside so you can always afford network fees.
            </p>
          )}
          {validNumber && !overBalance && (
            <FeePreview fee={fee} loading={settledPreview} />
          )}
          {confirmTx && (
            <p className="text-[13px] text-ink-soft">
              The cost changed since you last checked — review above and tap Save again to confirm.
            </p>
          )}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={!tx || busy || rebuilding || settledPreview || overBalance}
            className="h-13 w-full rounded-full bg-accent py-4 text-[15px] font-medium text-accent-ink outline-none transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {rebuilding
              ? "Checking…"
              : busy
                ? "Saving…"
                : confirmTx
                  ? `Confirm ${formatUsd(numeric)} at updated cost`
                  : validNumber && !overBalance
                    ? `Save ${formatUsd(numeric)}`
                    : "Enter an amount"}
          </button>
        </div>
      )}
    </section>
  );
}
