"use client";

import { useEffect, useState, useRef } from "react";
import {
  usePrivy,
  useLogin,
  useCreateWallet,
  useUser,
  useSignMessage,
  useWallets,
  useSign7702Authorization,
} from "@privy-io/react-auth";
import {
  UniversalAccount,
  type IAssetsResponse,
  UNIVERSAL_ACCOUNT_VERSION,
} from "@particle-network/universal-account-sdk";
import { TransferCard } from "@/components/TransferCard";
import { LandingHero } from "@/components/LandingHero";
import { WalletSidebar } from "@/components/WalletSidebar";
import { BackgroundDecoration } from "@/components/BackgroundDecoration";

export default function Home() {
  const { ready, authenticated, logout } = usePrivy();
  const { user } = useUser();
  const { login } = useLogin();
  const { createWallet } = useCreateWallet();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();

  const [walletCreated, setWalletCreated] = useState(false);
  const [balance, setBalance] = useState<IAssetsResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null);
  const [initializedOwner, setInitializedOwner] = useState<string | null>(null);
  const [smartAccountAddresses, setSmartAccountAddresses] = useState<{
    ownerAddress?: string;
    evmUaAddress?: string;
    solanaUaAddress?: string;
  } | null>(null);

  // Withdraw state
  const [withdrawSelectedChain, setWithdrawSelectedChain] =
    useState<string>("Base");

  const [transactions, setTransactions] = useState<
    Array<{
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
    }>
  >([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] =
    useState(false);
  const walletCreationAttempted = useRef(false);

  // 1. Ensure embedded wallet exists after login
  useEffect(() => {
    const ensureWallet = async () => {
      if (!ready || !user) return;

      const embeddedWallet = wallets?.find(
        (w) => w.walletClientType === "privy",
      );

      if (embeddedWallet) {
        setWalletCreated(true);
        walletCreationAttempted.current = true;
      } else if (!walletCreated && !walletCreationAttempted.current) {
        walletCreationAttempted.current = true;
        try {
          await createWallet();
          setWalletCreated(true);
        } catch (err) {
          console.error("Wallet creation failed:", err);
          walletCreationAttempted.current = false;
        }
      }
    };
    ensureWallet();
  }, [ready, user, createWallet, walletCreated, wallets]);

  // 2. Initialize Universal Account with EIP-7702 enabled
  useEffect(() => {
    const embeddedWallet = wallets?.find((w) => w.walletClientType === "privy");
    const owner = embeddedWallet?.address;

    if (!owner) return;
    if (initializedOwner === owner) return;

    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
      smartAccountOptions: {
        useEIP7702: true,
        name: "UNIVERSAL",
        version:
          process.env.UNIVERSAL_ACCOUNT_VERSION || UNIVERSAL_ACCOUNT_VERSION,
        ownerAddress: owner,
      },
      tradeConfig: { slippageBps: 100, universalGas: true },
    });

    setUniversalAccount(ua);
    setInitializedOwner(owner);
  }, [wallets, initializedOwner]);

  // 3. Fetch smart account addresses (EVM + Solana)
  useEffect(() => {
    (async () => {
      if (!universalAccount) return;
      try {
        const opts = await universalAccount.getSmartAccountOptions();
        const embeddedWallet = wallets?.find(
          (w) => w.walletClientType === "privy",
        );
        const owner = embeddedWallet?.address;
        if (!owner) return;
        setSmartAccountAddresses({
          ownerAddress: owner,
          evmUaAddress: opts?.smartAccountAddress || "",
          solanaUaAddress: opts?.solanaSmartAccountAddress || "",
        });
      } catch (e) {
        console.error("Error fetching smart account options", e);
      }
    })();
  }, [universalAccount, wallets]);

  // 4. Fetch initial balance
  useEffect(() => {
    (async () => {
      if (!universalAccount) return;
      try {
        const res = await universalAccount.getPrimaryAssets();
        setBalance(res);
      } catch (err) {
        console.error("Error fetching assets", err);
        setBalance({ assets: [], totalAmountInUSD: 0 });
      }
    })();
  }, [universalAccount]);

  // Refresh balance on demand
  const fetchBalance = async () => {
    try {
      if (!universalAccount) return;
      setIsLoadingBalance(true);
      const primaryAssets = await universalAccount.getPrimaryAssets();
      setBalance(primaryAssets || null);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch transaction history
  const fetchTransactions = async (
    page: number = 1,
    append: boolean = false,
  ) => {
    try {
      if (!universalAccount) return;

      if (append) {
        setIsLoadingMoreTransactions(true);
      } else {
        setIsLoadingTransactions(true);
      }

      const response = await universalAccount.getTransactions(page, 15);

      if (append) {
        setTransactions((prev) => [...prev, ...response.data]);
      } else {
        setTransactions(response.data);
      }

      setHasNextPage(response.hasNextPage);
      setTransactionsPage(response.currentPage);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
      setIsLoadingMoreTransactions(false);
    }
  };

  // Handle loading more transactions
  const handleLoadMoreTransactions = () => {
    if (hasNextPage && !isLoadingMoreTransactions) {
      fetchTransactions(transactionsPage + 1, true);
    }
  };

  // Handle tab change - fetch transactions when history tab is selected
  const handleTabChange = (tab: "balance" | "history") => {
    if (tab === "history" && transactions.length === 0) {
      fetchTransactions(1);
    }
  };

  if (!ready)
    return (
      <div className="flex h-screen items-center justify-center text-gray-600">
        Initializing...
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-linear-to-br from-[#0a0a1f] via-[#1a0f3e] to-[#0f0a2e] text-white relative overflow-hidden">
      <BackgroundDecoration />

      {!user ? (
        <LandingHero
          onLogin={() =>
            login({ loginMethods: ["email", "google", "twitter"] })
          }
          ready={ready}
          authenticated={authenticated}
        />
      ) : (
        <div className="w-full max-w-4xl relative z-10 px-4">
          <h1 className="text-2xl font-bold text-center text-white mb-18">
            Using 7702 with Particle Network: Walkthrough & Demo App
          </h1>
          <div className="flex justify-center gap-6">
            <WalletSidebar
              smartAccountAddresses={smartAccountAddresses}
              balance={balance}
              isLoadingBalance={isLoadingBalance}
              onRefreshBalance={fetchBalance}
              onLogout={logout}
              transactions={transactions}
              isLoadingTransactions={isLoadingTransactions}
              hasNextPage={hasNextPage}
              onLoadMoreTransactions={handleLoadMoreTransactions}
              isLoadingMoreTransactions={isLoadingMoreTransactions}
              onTabChange={handleTabChange}
            />

            {/* Main Content - Withdraw Widget */}
            <div className="w-96 shrink-0">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl h-[600px] flex flex-col overflow-hidden">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
                  Withdraw
                </h2>
                <TransferCard
                  universalAccount={universalAccount}
                  totalBalance={balance?.totalAmountInUSD || 0}
                  isSending={isSending}
                  onSendingChange={setIsSending}
                  onSuccess={(txHash) => {
                    setTransactionHash(txHash);
                    fetchBalance();
                  }}
                  onRefreshBalance={fetchBalance}
                  signMessage={signMessage}
                  signAuthorization={signAuthorization}
                  walletAddress={
                    wallets?.find((w) => w.walletClientType === "privy")
                      ?.address || ""
                  }
                  selectedChain={withdrawSelectedChain}
                  onChainChange={setWithdrawSelectedChain}
                />
              </div>

              {/* Transaction Success Notification - below the card */}
              {transactionHash && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <p className="text-sm text-green-400 font-semibold">
                        Transaction Submitted!
                      </p>
                    </div>
                    <a
                      href={`https://universalx.app/activity/details?id=${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      View on Explorer
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
