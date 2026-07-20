"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

/**
 * Shown whenever Save/Withdraw are gated closed. Two distinct causes share
 * this gate, and the closed default (fail-closed pre-first-read) must not
 * read as breakage:
 *   - `checking`: the very first position read hasn't landed yet — status is
 *     genuinely unknown, so we say so rather than implying an ongoing rebalance.
 *   - otherwise: the read succeeded and the vault's funds are deployed to Aave
 *     (position not fullyIdle) — mid-deployment the ERC-4626 share math
 *     misprices against idle-only assets, so no user transaction may execute.
 * The UI re-enables itself on the next 15s poll once the keeper has recalled
 * funds (or once the first read simply lands).
 */
export function OptimizingNotice({
  action,
  checking = false,
}: {
  action: "save" | "withdraw";
  checking?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await copyToClipboard("make exit");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
      <div className="flex items-center gap-2.5">
        <span className="relative grid size-2.5 place-items-center">
          <span className="absolute size-2.5 rounded-full bg-accent ey-breathe" />
        </span>
        <p className="text-sm font-medium text-ink">
          {checking ? "Checking vault status…" : "Optimizing yield — back in a moment"}
        </p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        {checking ? (
          "Looking up your savings — this only takes a moment."
        ) : (
          <>
            Your money is busy earning. {action === "save" ? "Adding" : "Withdrawing"} unlocks
            again in a few seconds.
          </>
        )}
      </p>
      {!checking && process.env.NODE_ENV === "development" && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
            make exit
          </button>
          <span className="rounded-full border border-dashed border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
            operator
          </span>
        </div>
      )}
    </div>
  );
}
