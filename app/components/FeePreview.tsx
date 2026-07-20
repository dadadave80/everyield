import { formatUsd } from "@/lib/ui";

interface FeePreviewProps {
  fee: { total: number; routing: number; gas: number } | null;
  loading: boolean;
}

export function FeePreview({ fee, loading }: FeePreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
        <span className="text-[13px] text-ink-faint">Checking total cost…</span>
        <span className="ey-shimmer h-4 w-14 rounded" />
      </div>
    );
  }
  if (!fee) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-soft">Total cost, incl. routing + gas</span>
        <span className="text-[15px] font-semibold tabular-nums tnum text-ink">
          {formatUsd(fee.total)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-ink-faint">
          Routing {formatUsd(fee.routing)} · Network gas {formatUsd(fee.gas)}
        </span>
        <span className="text-xs text-accent">Nothing hidden</span>
      </div>
    </div>
  );
}
