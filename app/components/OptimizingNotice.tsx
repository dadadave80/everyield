"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

/**
 * Shown while the vault's funds are deployed to Aave (position not fullyIdle).
 * Save + Withdraw stay disabled here: mid-deployment the ERC-4626 share math
 * misprices against idle-only assets, so no user transaction may execute. The
 * UI re-enables itself on the next 15s poll once the keeper has recalled funds.
 */
export function OptimizingNotice({ action }: { action: "save" | "withdraw" }) {
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
        <p className="text-sm font-medium text-ink">Optimizing yield — back in a moment</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Your money is busy earning. {action === "save" ? "Adding" : "Withdrawing"} unlocks
        again in a few seconds.
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
        make exit
      </button>
    </div>
  );
}
