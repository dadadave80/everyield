"use client";

import { ArrowDownToLine, ArrowUpRight, ExternalLink } from "lucide-react";
import { usdAmount, type ActivityStage, type LocalActivity } from "@/lib/send";
import { formatRelativeTime } from "@/lib/utils";
import { formatUsd } from "@/lib/ui";
import { VAULT } from "@/lib/addresses";

export interface HistoryTx {
  transactionId: string;
  tag: string;
  createdAt: string;
  status: number;
  change: { amount: string; amountInUSD: string };
}

interface ActivityFeedProps {
  local: LocalActivity[];
  history: HistoryTx[];
  loading: boolean;
}

const RAIL_LABELS = ["Signed", "Routing funds", "Executing", "Confirmed"] as const;

const STAGE_TEXT: Record<ActivityStage, string> = {
  signing: "Signing…",
  signed: "Signed",
  routing: "Routing funds",
  executing: "Executing",
  delayed: "Taking longer than usual",
  confirmed: "Confirmed",
  failed: "Couldn't complete",
};

function railState(stage: ActivityStage): { done: number; active: number; failed: boolean } {
  switch (stage) {
    case "signing":
      return { done: 0, active: 0, failed: false };
    case "signed":
    case "routing":
      return { done: 1, active: 1, failed: false };
    case "executing":
    // "delayed" is not a failure and not a fake confirmation — it's still the
    // executing step, just past the point where a signal was expected. Same
    // calm rail visual; only the status text (above) and copy differ.
    case "delayed":
      return { done: 2, active: 2, failed: false };
    case "confirmed":
      return { done: 4, active: -1, failed: false };
    case "failed":
      return { done: 0, active: -1, failed: true };
  }
}

function universalxLink(id: string) {
  return `https://universalx.app/activity/details?id=${id}`;
}

// Does this history row touch the savings vault? getTransactions() passes the
// backend JSON through untouched (SDK-typed `any`), so a target/contract address
// — if the record carries one — could sit under any of a few plausible keys.
// The fields the app is *known* to receive are {transactionId, tag, createdAt,
// status, change:{amount, amountInUSD}}, none of which is guaranteed to be an
// address; so this is a best-effort scan across likely keys, case-insensitive.
// A hit is a strong, app-specific signal that the row is a deposit/redeem.
function touchesVault(tx: HistoryTx): boolean {
  const rec = tx as unknown as Record<string, unknown>;
  const change = (rec.change ?? {}) as Record<string, unknown>;
  const token = (change.token ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    rec.receiver, rec.to, rec.toAddress, rec.target, rec.contract, rec.contractAddress,
    change.to, change.toAddress, change.contractAddress, token.address,
  ];
  const vault = VAULT.toLowerCase();
  return candidates.some((v) => typeof v === "string" && v.toLowerCase() === vault);
}

// getTransactions() is typed `any` by the SDK, so a row's `tag` can be an
// unrecognized/placeholder value (observed: "Unknown") when the backend's
// tx-type doesn't match the mapper. Label priority:
//   1. Vault match — authoritative. From the unified account's view, money
//      LEAVING (outbound) went INTO the vault ("Added to savings"); money
//      ARRIVING (inbound) came back OUT ("Withdrew").
//   2. A recognized backend tag (never the "Unknown" placeholder).
//   3. Directional fallback, FLIPPED to match live evidence — a real vault
//      deposit is outbound from the UA yet must read "Added to savings" (the
//      earlier inbound=save mapping rendered it inverted as "Withdrew").
//   4. "Transfer" only when no direction signal exists at all.
function historyLabel(
  tag: string | undefined | null,
  direction: "inbound" | "outbound" | null,
  vaultMatch: boolean,
): { text: string; recognized: boolean } {
  if (vaultMatch && direction) {
    return direction === "outbound"
      ? { text: "Added to savings", recognized: false }
      : { text: "Withdrew", recognized: false };
  }
  const trimmed = tag?.trim();
  if (trimmed && trimmed.toLowerCase() !== "unknown") {
    return { text: trimmed, recognized: true };
  }
  if (direction === "outbound") return { text: "Added to savings", recognized: false };
  if (direction === "inbound") return { text: "Withdrew", recognized: false };
  return { text: "Transfer", recognized: false };
}

function directionOf(amount: unknown): "inbound" | "outbound" | null {
  if (typeof amount !== "string" || amount.trim() === "") return null;
  return amount.trim().startsWith("-") ? "outbound" : "inbound";
}

export function ActivityFeed({ local, history, loading }: ActivityFeedProps) {
  const localIds = new Set(local.map((l) => l.transactionId).filter(Boolean));
  const filteredHistory = history.filter((h) => !localIds.has(h.transactionId));
  const empty = local.length === 0 && filteredHistory.length === 0 && !loading;

  return (
    <section
      className="ey-rise card-shadow rounded-3xl border border-line bg-surface p-6"
      style={{ animationDelay: "320ms" }}
    >
      <p className="font-display text-lg italic text-ink-soft">Activity</p>

      <div className="mt-4 space-y-2">
        {local.map((entry) => (
          <LocalRow key={entry.id} entry={entry} />
        ))}

        {filteredHistory.map((tx) => (
          <HistoryRow key={tx.transactionId} tx={tx} />
        ))}

        {loading && local.length === 0 && filteredHistory.length === 0 && (
          <>
            {[0, 1].map((i) => (
              <div key={i} className="ey-shimmer h-14 rounded-2xl" />
            ))}
          </>
        )}

        {empty && (
          <p className="py-6 text-center text-sm text-ink-faint">
            Nothing yet. Your first deposit will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

function LocalRow({ entry }: { entry: LocalActivity }) {
  const rail = railState(entry.stage);
  const isSave = entry.kind === "save";
  const done = entry.stage === "confirmed";

  return (
    <div className="rounded-2xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            {isSave ? (
              <ArrowDownToLine className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              {isSave ? "Adding to savings" : "Withdrawing"}
            </p>
            <p className="text-[13px] tabular-nums tnum text-ink-soft">{entry.amountLabel}</p>
          </div>
        </div>
        <span
          className={`text-[13px] font-medium ${
            rail.failed ? "text-danger" : done ? "text-positive" : "text-ink-soft"
          }`}
        >
          {STAGE_TEXT[entry.stage]}
        </span>
      </div>

      {!rail.failed && (
        <div className="mt-3.5 flex items-center">
          {RAIL_LABELS.map((label, i) => {
            const isDone = i < rail.done;
            const isActive = i === rail.active;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-1.5">
                  <span
                    className={`size-2.5 rounded-full transition-colors ${
                      isDone
                        ? "bg-accent"
                        : isActive
                          ? "bg-accent ey-breathe"
                          : "bg-line"
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      isDone || isActive ? "text-ink-soft" : "text-ink-faint"
                    }`}
                  >
                    {label}
                  </span>
                </span>
                {i < RAIL_LABELS.length - 1 && (
                  <span className="mx-1 -mt-4 h-px flex-1 bg-line">
                    <span
                      className="block h-px bg-accent transition-all duration-500"
                      style={{ width: isDone ? "100%" : "0%" }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {entry.transactionId && (
        <a
          href={universalxLink(entry.transactionId)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Track this transfer
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

function HistoryRow({ tx }: { tx: HistoryTx }) {
  // getTransactions() is typed `any` by the SDK, so amountInUSD's runtime shape
  // (plain decimal vs. 1e18-scaled hex, per readFeePreview) isn't guaranteed —
  // usdAmount handles both.
  const usd = Math.abs(usdAmount(tx.change.amountInUSD));
  const direction = directionOf(tx.change?.amount);
  const inbound = direction !== "outbound";
  const label = historyLabel(tx.tag, direction, touchesVault(tx));
  const status =
    tx.status === 7
      ? { label: "Confirmed", cls: "text-positive" }
      : tx.status === 0
        ? { label: "Failed", cls: "text-danger" }
        : { label: "In progress", cls: "text-ink-soft" };

  return (
    <a
      href={universalxLink(tx.transactionId)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2/60"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-ink-soft">
          {inbound ? (
            <ArrowDownToLine className="size-4" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
        </span>
        <div>
          <p className={`text-sm font-medium text-ink ${label.recognized ? "capitalize" : ""}`}>
            {label.text}
          </p>
          <p className="text-xs text-ink-faint">{formatRelativeTime(tx.createdAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums tnum text-ink">{formatUsd(usd)}</p>
        <p className={`text-xs ${status.cls}`}>{status.label}</p>
      </div>
    </a>
  );
}
