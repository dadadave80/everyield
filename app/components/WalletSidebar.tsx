/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, LogOut, X, Check } from "lucide-react";
import { truncateAddress, copyToClipboard, LOGO_URLS, SUPPORTED_CHAINS } from "@/lib/utils";
import { TransactionList, type Transaction } from "@/components/TransactionList";
import type { IAssetsResponse } from "@particle-network/universal-account-sdk";

type TabType = "balance" | "history";

interface WalletSidebarProps {
  smartAccountAddresses: {
    ownerAddress?: string;
    evmUaAddress?: string;
    solanaUaAddress?: string;
  } | null;
  balance: IAssetsResponse | null;
  isLoadingBalance: boolean;
  onRefreshBalance: () => void;
  onLogout: () => void;
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  hasNextPage: boolean;
  onLoadMoreTransactions?: () => void;
  isLoadingMoreTransactions?: boolean;
  onTabChange?: (tab: TabType) => void;
}

export function WalletSidebar({
  smartAccountAddresses,
  balance,
  isLoadingBalance,
  onRefreshBalance,
  onLogout,
  transactions,
  isLoadingTransactions,
  hasNextPage,
  onLoadMoreTransactions,
  isLoadingMoreTransactions,
  onTabChange,
}: WalletSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("balance");
  const [showChainsDialog, setShowChainsDialog] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<"evm" | "sol" | null>(null);

  const evmChains = SUPPORTED_CHAINS.filter(c => c.type === "evm");

  const handleCopyAddress = async (address: string | undefined, type: "evm" | "sol") => {
    await copyToClipboard(address);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const totalBalance = balance?.totalAmountInUSD || 0;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="w-72 shrink-0">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl sticky top-4 h-[600px] flex flex-col">
        <div className="p-3 border-b border-white/10 shrink-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">Universal Account</span>
            </div>
            <Button
              onClick={onLogout}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400 transition-colors h-auto p-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Addresses - compact layout */}
          <div className="space-y-1.5">
            {/* EVM Address */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium shrink-0">EVM</span>
                <code className="text-xs text-white font-mono truncate">
                  {truncateAddress(smartAccountAddresses?.ownerAddress || "")}
                </code>
              </div>
              <Button
                type="button"
                onClick={() => handleCopyAddress(smartAccountAddresses?.ownerAddress, "evm")}
                variant="ghost"
                size="sm"
                className={`transition-all duration-200 h-auto p-1 rounded shrink-0 ${
                  copiedAddress === "evm"
                    ? "text-green-400 bg-green-400/10"
                    : "text-gray-400 hover:text-purple-300 hover:bg-white/10"
                }`}
              >
                {copiedAddress === "evm" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>

            {/* Solana Address */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">SOL</span>
                  <img src={LOGO_URLS.Solana} alt="Solana" className="w-3 h-3 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <code className="text-xs text-gray-300 font-mono truncate">
                  {truncateAddress(smartAccountAddresses?.solanaUaAddress || "")}
                </code>
              </div>
              <Button
                type="button"
                onClick={() => handleCopyAddress(smartAccountAddresses?.solanaUaAddress, "sol")}
                variant="ghost"
                size="sm"
                className={`transition-all duration-200 h-auto p-1 rounded shrink-0 ${
                  copiedAddress === "sol"
                    ? "text-green-400 bg-green-400/10"
                    : "text-gray-400 hover:text-purple-300 hover:bg-white/10"
                }`}
              >
                {copiedAddress === "sol" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>

            {/* Supported Chains Button */}
            <button
              onClick={() => setShowChainsDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              <div className="flex -space-x-1">
                {evmChains.slice(0, 6).map((chain) => (
                  <img
                    key={chain.name}
                    src={chain.logo}
                    alt={chain.name}
                    className="w-3.5 h-3.5 rounded-full ring-1 ring-gray-800"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ))}
              </div>
              <span>{SUPPORTED_CHAINS.length} chains supported</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-white/10 shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
            Wallet Balance
          </p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold text-white">
              {isLoadingBalance ? "..." : `$${totalBalance.toFixed(2)}`}
            </span>
            <Button
              onClick={onRefreshBalance}
              disabled={isLoadingBalance}
              size="sm"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 h-auto border border-white/10"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-300 ${
                  isLoadingBalance ? "animate-spin" : ""
                }`}
              />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => handleTabChange("balance")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "balance"
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Assets
            {activeTab === "balance" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            History
            {activeTab === "history" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {activeTab === "balance" ? (
            <div className="space-y-2">
              {/* Primary Assets from Particle SDK - filter out dust (< $0.01) */}
              {balance?.assets
                ?.filter((asset) => asset.amountInUSD >= 0.01)
                .map((asset) => (
                  <div
                    key={`primary-${asset.tokenType}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={
                            LOGO_URLS[asset.tokenType.toUpperCase()] ||
                            LOGO_URLS.ETH
                          }
                          alt={asset.tokenType}
                          width={36}
                          height={36}
                          className="rounded-full"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {asset.tokenType.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {parseFloat(asset.amount.toString()).toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white text-sm">
                        ${asset.amountInUSD.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {parseFloat(asset.amount.toString()).toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}

              {/* Empty state */}
              {!balance?.assets?.filter((a) => a.amountInUSD >= 0.01).length &&
                !isLoadingBalance && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No assets found
                  </div>
                )}
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              isLoading={isLoadingTransactions}
              hasNextPage={hasNextPage}
              onLoadMore={onLoadMoreTransactions}
              isLoadingMore={isLoadingMoreTransactions}
            />
          )}
        </div>
      </div>

      {/* Supported Chains Dialog */}
      {showChainsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowChainsDialog(false)}
          />
          <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-4 w-72 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Supported Chains</h3>
              <button
                onClick={() => setShowChainsDialog(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* EVM Chains */}
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
                EVM Networks ({evmChains.length})
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {evmChains.map((chain) => (
                  <div
                    key={chain.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5"
                  >
                    <img
                      src={chain.logo}
                      alt={chain.name}
                      className="w-4 h-4 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-xs text-gray-300 truncate">{chain.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Solana */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
                Non-EVM Networks (1)
              </p>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                <img
                  src={LOGO_URLS.Solana}
                  alt="Solana"
                  className="w-4 h-4 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs text-gray-300">Solana</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
