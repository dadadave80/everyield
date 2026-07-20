/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  formatTransactionDate,
  getTransactionStatus,
  getTransactionTagLabel,
  getChainName,
  LOGO_URLS,
} from "@/lib/utils";
import { TransactionDetailDialog } from "@/components/TransactionDetailDialog";

export interface Transaction {
  transactionId: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
  targetToken: {
    name: string;
    type: string;
    image: string;
    price: number;
    symbol: string;
    address: string;
    assetId: string;
    chainId: number;
    decimals: number;
    realDecimals: number;
    isPrimaryToken: boolean;
    isSmartRouterSupported: boolean;
  };
  change: {
    amount: string;
    amountInUSD: string;
    from: string;
    to: string;
  };
  detail: {
    redPacketCount: number;
  };
  status: number;
  fromChains: number[];
  toChains: number[];
  exchangeRateUSD: Array<{
    type: string;
    exchangeRate: {
      type: string;
      price: number;
    };
  }>;
}

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  hasNextPage: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function TransactionList({
  transactions,
  isLoading,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-white/5"
          >
            <div className="w-9 h-9 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-24" />
              <div className="h-3 bg-white/10 rounded w-16" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 bg-white/10 rounded w-16 ml-auto" />
              <div className="h-3 bg-white/10 rounded w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const status = getTransactionStatus(tx.status);
        const isPositive = tx.change.amount.startsWith("+");
        const fromChain = tx.fromChains[0];
        const toChain = tx.toChains[0];

        return (
          <button
            key={tx.transactionId}
            onClick={() => setSelectedTransaction(tx)}
            className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={tx.targetToken.image || LOGO_URLS[tx.targetToken.symbol.toUpperCase()] || LOGO_URLS.ETH}
                  alt={tx.targetToken.symbol}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {tx.targetToken.symbol}
                    </p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                      {getTransactionTagLabel(tx.tag)}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm shrink-0 ${isPositive ? "text-green-400" : "text-white"}`}>
                    {tx.change.amount}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0 truncate">
                    <span className="truncate">{getChainName(fromChain)}</span>
                    {fromChain !== toChain && (
                      <>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">{getChainName(toChain)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTransactionDate(tx.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {hasNextPage && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
        >
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      <TransactionDetailDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
