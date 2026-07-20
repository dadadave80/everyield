"use client";

import { useState } from "react";
import { formatUnits } from "ethers";
import { ArrowUpRight } from "lucide-react";
import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";
import type { Position } from "@/lib/everyield";
import { createWithdrawTx } from "@/lib/everyield";
import { readFeePreview, type SendArgs } from "@/lib/send";
import { formatUsd, splitUsd, useCountUp } from "@/lib/ui";
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
  const [tx, setTx] = useState<ITransaction | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = position ? Number(position.display) : 0;
  const animatedValue = useCountUp(value);
  const { dollars, cents } = splitUsd(animatedValue);
  const hasSavings = !!position && position.shares > 0n;
  const fullyIdle = position?.fullyIdle ?? true;
  const fee = tx ? readFeePreview(tx) : null;

  const openWithdraw = async () => {
    if (!ua || !owner || !position || position.shares <= 0n) return;
    setError(null);
    setMode("confirm");
    setPreviewing(true);
    setTx(null);
    try {
      const built = await createWithdrawTx(ua, position.shares, owner);
      setTx(built as ITransaction);
    } catch (e) {
      console.error("withdraw preview failed", e);
      setError("Couldn't prepare the withdrawal. Try again in a moment.");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmWithdraw = async () => {
    if (!tx || !position) return;
    setError(null);
    try {
      await onSend({
        kind: "withdraw",
        transaction: tx,
        amountLabel: formatUsd(value),
        title: `Withdraw ${formatUsd(value)} from Everyield savings`,
      });
      setMode("idle");
      setTx(null);
    } catch {
      setError("That didn't go through. Nothing was moved — you can retry.");
    }
  };

  const cancel = () => {
    setMode("idle");
    setTx(null);
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
            <OptimizingNotice action="withdraw" />
          ) : mode === "idle" ? (
            <button
              type="button"
              onClick={openWithdraw}
              disabled={busy}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Withdraw
              <ArrowUpRight className="size-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-line bg-surface-2/50 px-4 py-3 text-sm text-ink-soft">
                Withdraw your full balance —{" "}
                <span className="font-medium text-ink">{formatUsd(value)}</span> back to your
                available money.
              </div>
              <FeePreview fee={fee} loading={previewing} />
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
                  disabled={busy || previewing || !tx}
                  className="h-11 flex-[1.4] rounded-full bg-accent text-sm font-medium text-accent-ink transition-[filter,transform] hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                >
                  {busy ? "Withdrawing…" : "Confirm withdrawal"}
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
