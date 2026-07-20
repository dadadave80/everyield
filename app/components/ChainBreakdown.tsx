"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { IAsset } from "@particle-network/universal-account-sdk";
import { getChainName } from "@/lib/utils";
import { formatUsd } from "@/lib/ui";

interface ChainBreakdownProps {
  assets: IAsset[] | undefined;
  total: number;
  // Value (USD) of the on-chain savings position, so "where your money lives"
  // shows the whole picture, not just the spendable balance. 0 = not saving.
  savings: number;
}

interface Row {
  name: string;
  usd: number;
  secondary?: string;
}

export function ChainBreakdown({ assets, total, savings }: ChainBreakdownProps) {
  const [open, setOpen] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const byChain = new Map<string, number>();
    for (const asset of assets ?? []) {
      for (const agg of asset.chainAggregation ?? []) {
        if (!agg?.amountInUSD || agg.amountInUSD < 0.01) continue;
        const name = getChainName(agg.token.chainId);
        byChain.set(name, (byChain.get(name) ?? 0) + agg.amountInUSD);
      }
    }
    const list: Row[] = [...byChain.entries()].map(([name, usd]) => ({ name, usd }));
    // Savings is a first-class "place" money lives — the vault runs on Arbitrum,
    // surfaced as subtle secondary text (chain names are allowed in this disclosure).
    if (savings >= 0.01) list.push({ name: "Everyield savings", usd: savings, secondary: "Arbitrum" });
    return list.sort((a, b) => b.usd - a.usd);
  }, [assets, savings]);

  const count = rows.length;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center justify-center gap-1.5 py-1 text-[13px] text-ink-faint transition-colors hover:text-ink-soft"
      >
        <span>
          Where your money lives
          {count > 0 && (
            <span className="text-ink-faint"> · {count} place{count === 1 ? "" : "s"}</span>
          )}
        </span>
        <ChevronDown
          className={`size-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="ey-rise mt-3 overflow-hidden rounded-2xl border border-line bg-surface/60 p-1">
          <p className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Where your money lives
          </p>
          {count === 0 ? (
            <p className="px-4 pb-4 text-sm text-ink-soft">
              Nothing yet — add to savings and it&apos;ll show up here.
            </p>
          ) : (
            <ul className="pb-1">
              {rows.map((row) => {
                const share = total > 0 ? Math.max(2, (row.usd / total) * 100) : 0;
                return (
                  <li
                    key={row.name}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="flex w-28 shrink-0 flex-col">
                      <span className="truncate text-sm text-ink">{row.name}</span>
                      {row.secondary && (
                        <span className="truncate text-[11px] text-ink-faint">{row.secondary}</span>
                      )}
                    </span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-accent/70"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                    <span className="w-20 shrink-0 text-right text-sm tabular-nums tnum text-ink-soft">
                      {formatUsd(row.usd)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
