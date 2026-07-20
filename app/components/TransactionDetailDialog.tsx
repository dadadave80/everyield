/* eslint-disable @next/next/no-img-element */
import { X, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTransactionStatus,
  getTransactionTagLabel,
  getChainName,
  LOGO_URLS,
  truncateAddress,
  copyToClipboard,
} from "@/lib/utils";
import type { Transaction } from "@/components/TransactionList";

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailDialog({
  transaction,
  onClose,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const tx = transaction;
  const status = getTransactionStatus(tx.status);
  const isPositive = tx.change.amount.startsWith("+");
  const fromChain = tx.fromChains[0];
  const toChain = tx.toChains[0];
  const date = new Date(tx.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Transaction Details
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white h-auto p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Token and Amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    tx.targetToken.image ||
                    LOGO_URLS[tx.targetToken.symbol.toUpperCase()] ||
                    LOGO_URLS.ETH
                  }
                  alt={tx.targetToken.symbol}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">
                  {tx.targetToken.symbol}
                </p>
                <p className="text-sm text-gray-400">{tx.targetToken.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-bold text-xl ${isPositive ? "text-green-400" : "text-white"}`}
              >
                {tx.change.amount}
              </p>
              <p className="text-sm text-gray-400">
                ${Math.abs(parseFloat(tx.change.amountInUSD)).toFixed(2)} USD
              </p>
            </div>
          </div>

          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
              {getTransactionTagLabel(tx.tag)}
            </span>
            <span
              className={`text-sm px-2.5 py-1 rounded-full ${
                status.label === "Completed"
                  ? "bg-green-500/20 text-green-400"
                  : status.label === "Failed"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {status.label}
            </span>
          </div>

          {/* Details List */}
          <div className="space-y-3 pt-2">
            {/* Route */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Route</span>
              <div className="flex items-center gap-2 text-sm text-white">
                <span>{getChainName(fromChain)}</span>
                {fromChain !== toChain && (
                  <>
                    <ArrowRight className="w-4 h-4 text-gray-500" />
                    <span>{getChainName(toChain)}</span>
                  </>
                )}
              </div>
            </div>

            {/* From Address */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">From</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white font-mono">
                  {truncateAddress(tx.change.from)}
                </code>
                <Button
                  onClick={() => copyToClipboard(tx.change.from)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-purple-300 h-auto p-1 rounded hover:bg-white/5"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* To Address */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">To</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white font-mono">
                  {truncateAddress(tx.change.to)}
                </code>
                <Button
                  onClick={() => copyToClipboard(tx.change.to)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-purple-300 h-auto p-1 rounded hover:bg-white/5"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Transaction ID</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white font-mono">
                  {truncateAddress(tx.transactionId)}
                </code>
                <Button
                  onClick={() => copyToClipboard(tx.transactionId)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-purple-300 h-auto p-1 rounded hover:bg-white/5"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Date</span>
              <span className="text-sm text-white">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Token Price at Time */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">Token Price</span>
              <span className="text-sm text-white">
                ${tx.targetToken.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
