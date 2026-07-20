"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Check, Copy, LogOut } from "lucide-react";
import { formatUnits } from "ethers";

import { LandingHero } from "@/components/LandingHero";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChainBreakdown } from "@/components/ChainBreakdown";
import { PositionCard } from "@/components/PositionCard";
import { SaveCard } from "@/components/SaveCard";
import { ActivityFeed, type HistoryTx } from "@/components/ActivityFeed";

import { readApy, readPosition, type Position } from "@/lib/everyield";
import { runSend, type ActivityStage, type LocalActivity, type SendArgs } from "@/lib/send";
import { formatUsd, splitUsd, useCountUp } from "@/lib/ui";
import { copyToClipboard, truncateAddress } from "@/lib/utils";

// The final Executing → Confirmed transition is signal-driven, never a timer
// (see `pendingConfirmations` below). If no signal lands within this window
// we surface a neutral "taking longer than usual" state instead of pretending
// nothing is happening — never a fake Confirmed.
const CONFIRMATION_TIMEOUT_MS = 10 * 60 * 1000;
// History is normally fetched once (see `fetchHistory`); while a local
// activity is awaiting its confirmation signal we tighten just that fetch
// (plus a balance refresh, for the UA-balance side of signal (b)) to this
// cadence, then stop as soon as nothing is pending — never a permanent poll.
const PENDING_POLL_MS = 10_000;
// Guards against float noise between polls, not against real yield accrual
// (which is orders of magnitude smaller than any real deposit/withdraw over
// a 10s–15s window).
const SIGNAL_EPSILON_USD = 0.005;

interface PendingConfirmation {
  kind: "save" | "withdraw";
  transactionId?: string;
  baselineSavingsUsd: number;
  baselineUaUsd: number;
}

export default function Home() {
  const { ready, authenticated, logout } = usePrivy();
  const { user } = useUser();
  const { login } = useLogin();
  const { createWallet } = useCreateWallet();
  const { signMessage } = useSignMessage();
  const { wallets, ready: walletsReady } = useWallets();
  const { signAuthorization } = useSign7702Authorization();

  const [walletCreated, setWalletCreated] = useState(false);
  const [balance, setBalance] = useState<IAssetsResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [universalAccount, setUniversalAccount] = useState<UniversalAccount | null>(null);
  const [initializedOwner, setInitializedOwner] = useState<string | null>(null);
  const [smartAccountAddresses, setSmartAccountAddresses] = useState<{
    ownerAddress?: string;
    evmUaAddress?: string;
    solanaUaAddress?: string;
  } | null>(null);

  const [position, setPosition] = useState<Position | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [apy, setApy] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [localActivity, setLocalActivity] = useState<LocalActivity[]>([]);
  const advanceTimers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});
  // Local activities awaiting a real confirmation signal (see `send` and the
  // confirmation-check effect below). Kept in a ref, not state — mutating it
  // never needs to itself trigger a render; the `setLocalActivity`/`setStage`
  // calls that always accompany a mutation already do that.
  const pendingConfirmations = useRef<Record<string, PendingConfirmation>>({});
  // Freshest position/balance without making `send` (and everything it's
  // passed to) re-identity every 15s poll tick.
  const positionRef = useRef<Position | null>(null);
  const balanceRef = useRef<IAssetsResponse | null>(null);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const walletCreationAttempted = useRef(false);

  const walletAddress =
    wallets?.find((w) => w.walletClientType === "privy")?.address || "";
  // Under EIP-7702 the embedded wallet IS the executor of every vault call (it
  // signs the authorization + root hash), so it must also be `owner`: ERC-4626
  // `redeem(shares, receiver, owner)` requires `msg.sender == owner`. Using
  // `evmUaAddress` here would let deposits succeed while withdrawals revert.
  // `smartAccountAddresses` is retained for display/diagnostics only — never
  // for a vault call.
  const owner = walletAddress;

  // 1. Ensure embedded wallet exists after login
  useEffect(() => {
    const ensureWallet = async () => {
      // Wait for Privy's wallet list to actually hydrate before deciding it's
      // empty — otherwise this fires on every reload against a stale/loading
      // list and `createWallet()` reliably fails with "User already has an
      // embedded wallet" (benign, but noisy in the console).
      if (!ready || !authenticated || !user || !walletsReady) return;
      const embeddedWallet = wallets?.find((w) => w.walletClientType === "privy");
      if (embeddedWallet) {
        setWalletCreated(true);
        walletCreationAttempted.current = true;
      } else if (!walletCreated && !walletCreationAttempted.current) {
        walletCreationAttempted.current = true;
        try {
          await createWallet();
          setWalletCreated(true);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!message.includes("already has an embedded wallet")) {
            console.error("Wallet creation failed:", err);
          }
          walletCreationAttempted.current = false;
        }
      }
    };
    ensureWallet();
  }, [ready, authenticated, user, createWallet, walletCreated, wallets, walletsReady]);

  // 2. Initialize Universal Account with EIP-7702 enabled
  useEffect(() => {
    const embeddedWallet = wallets?.find((w) => w.walletClientType === "privy");
    const ownerAddr = embeddedWallet?.address;
    if (!ownerAddr) return;
    if (initializedOwner === ownerAddr) return;

    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
      smartAccountOptions: {
        useEIP7702: true,
        name: "UNIVERSAL",
        version: process.env.UNIVERSAL_ACCOUNT_VERSION || UNIVERSAL_ACCOUNT_VERSION,
        ownerAddress: ownerAddr,
      },
      // universalGas only ever appended PARTI to the fee-token candidates; gas
      // abstraction from the unified balance is (and always was) the default.
      // Our balance is USDC/ETH, so dropping it loses nothing.
      tradeConfig: { slippageBps: 100 },
    });

    setUniversalAccount(ua);
    setInitializedOwner(ownerAddr);
  }, [wallets, initializedOwner]);

  // 3. Fetch smart account addresses (EVM + Solana)
  useEffect(() => {
    (async () => {
      if (!universalAccount) return;
      try {
        const opts = await universalAccount.getSmartAccountOptions();
        const embeddedWallet = wallets?.find((w) => w.walletClientType === "privy");
        const ownerAddr = embeddedWallet?.address;
        if (!ownerAddr) return;
        setSmartAccountAddresses({
          ownerAddress: ownerAddr,
          evmUaAddress: opts?.smartAccountAddress || "",
          solanaUaAddress: opts?.solanaSmartAccountAddress || "",
        });
      } catch (e) {
        console.error("Error fetching smart account options", e);
      }
    })();
  }, [universalAccount, wallets]);

  // Diagnostic: owner is always walletAddress (see above), but a live
  // divergence from the Universal Account's EVM address would mean 7702
  // execution and vault ownership have split — worth flagging loudly.
  useEffect(() => {
    const evmUaAddress = smartAccountAddresses?.evmUaAddress;
    if (evmUaAddress && walletAddress && evmUaAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      console.warn("owner divergence: evmUaAddress differs from walletAddress", {
        evmUaAddress,
        walletAddress,
      });
    }
  }, [smartAccountAddresses, walletAddress]);

  // Refresh the unified balance
  const fetchBalance = useCallback(async () => {
    if (!universalAccount) return;
    try {
      setIsLoadingBalance(true);
      const res = await universalAccount.getPrimaryAssets();
      setBalance(res || { assets: [], totalAmountInUSD: 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [universalAccount]);

  // 4. Initial balance load
  useEffect(() => {
    if (universalAccount) fetchBalance();
  }, [universalAccount, fetchBalance]);

  // Refresh the on-chain savings position + live APY
  const refreshPosition = useCallback(async () => {
    if (!owner) return;
    try {
      const [pos, rate] = await Promise.all([
        readPosition(owner),
        readApy().catch(() => null),
      ]);
      setPosition(pos);
      if (rate != null) setApy(rate);
    } catch (e) {
      console.error("position read failed", e);
    } finally {
      setPositionLoading(false);
    }
  }, [owner]);

  // Poll position + APY every 15s (the fullyIdle guard re-enables here)
  useEffect(() => {
    if (!owner) return;
    setPositionLoading(true);
    refreshPosition();
    const id = setInterval(refreshPosition, 15000);
    return () => clearInterval(id);
  }, [owner, refreshPosition]);

  // Transaction history for the activity feed
  const fetchHistory = useCallback(async () => {
    if (!universalAccount) return;
    try {
      setHistoryLoading(true);
      const response = await universalAccount.getTransactions(1, 15);
      setHistory((response?.data as HistoryTx[]) || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [universalAccount]);

  useEffect(() => {
    if (universalAccount) fetchHistory();
  }, [universalAccount, fetchHistory]);

  // Clean up any pending stage-advance timers on unmount
  useEffect(() => {
    const timers = advanceTimers.current;
    return () => {
      Object.values(timers).forEach((list) => list.forEach(clearTimeout));
    };
  }, []);

  // ---- optimistic activity log ----
  const setStage = useCallback((id: string, stage: LocalActivity["stage"]) => {
    setLocalActivity((prev) => prev.map((e) => (e.id === id ? { ...e, stage } : e)));
  }, []);

  // Advances `id` to `next` only if it's still at `expected` — guards the
  // cosmetic pacing timers below from clobbering a stage that a real signal
  // (or the failure path) has already moved past.
  const setStageIfCurrent = useCallback((id: string, expected: ActivityStage, next: ActivityStage) => {
    setLocalActivity((prev) => prev.map((e) => (e.id === id && e.stage === expected ? { ...e, stage: next } : e)));
  }, []);

  // Whichever arrives first confirms an in-flight local activity:
  //   (a) its transactionId shows up in history with a confirmed status (7), or
  //   (b) a position/balance change consistent with the operation — deposit:
  //       savings value rose; withdraw: UA balance rose, or savings fell.
  // Driven entirely by the polls that already exist (history fetch, the 15s
  // position poll, balance fetch) — never a timer standing in for the real thing.
  useEffect(() => {
    const pending = pendingConfirmations.current;
    for (const id of Object.keys(pending)) {
      const meta = pending[id];

      const historyMatch = meta.transactionId
        ? history.find((h) => h.transactionId === meta.transactionId)
        : undefined;
      if (historyMatch && historyMatch.status === 7) {
        delete pending[id];
        setStage(id, "confirmed");
        continue;
      }

      const currentSavingsUsd = position ? Number(formatUnits(position.usdcValue, 6)) : meta.baselineSavingsUsd;
      const currentUaUsd = balance?.totalAmountInUSD ?? meta.baselineUaUsd;
      const signalB =
        meta.kind === "save"
          ? currentSavingsUsd > meta.baselineSavingsUsd + SIGNAL_EPSILON_USD
          : currentUaUsd > meta.baselineUaUsd + SIGNAL_EPSILON_USD ||
            currentSavingsUsd < meta.baselineSavingsUsd - SIGNAL_EPSILON_USD;

      if (signalB) {
        delete pending[id];
        setStage(id, "confirmed");
      }
    }
  }, [history, position, balance, setStage]);

  // While anything is awaiting its confirmation signal, tighten the
  // history + balance refresh to ~10s so signals (a)/(b) land promptly; stop
  // the moment nothing is pending — never a permanent extra poll.
  useEffect(() => {
    if (Object.keys(pendingConfirmations.current).length === 0) return;
    const id = setInterval(() => {
      fetchHistory();
      fetchBalance();
    }, PENDING_POLL_MS);
    return () => clearInterval(id);
  }, [localActivity, fetchHistory, fetchBalance]);

  const send = useCallback(
    async (args: SendArgs) => {
      if (!universalAccount || !walletAddress) throw new Error("Account not ready");
      setIsSending(true);
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setLocalActivity((prev) => [
        { id, kind: args.kind, amountLabel: args.amountLabel, stage: "signing", createdAt: Date.now() },
        ...prev,
      ]);
      // Baseline captured before the transaction is even signed, so a later
      // rise/fall can be attributed to it (signal (b), the fallback).
      pendingConfirmations.current[id] = {
        kind: args.kind,
        baselineSavingsUsd: positionRef.current ? Number(formatUnits(positionRef.current.usdcValue, 6)) : 0,
        baselineUaUsd: balanceRef.current?.totalAmountInUSD ?? 0,
      };
      try {
        const txId = await runSend({
          ua: universalAccount,
          transaction: args.transaction,
          walletAddress,
          signMessage,
          signAuthorization,
          title: args.title,
          onStage: (s) => setStage(id, s),
        });
        if (pendingConfirmations.current[id]) {
          pendingConfirmations.current[id].transactionId = txId || undefined;
        }
        setLocalActivity((prev) =>
          prev.map((e) => (e.id === id ? { ...e, transactionId: txId, stage: "routing" } : e)),
        );
        // Cosmetic pacing only, for Signed → Routing funds → Executing. The
        // Executing → Confirmed transition never comes from a timer — see the
        // confirmation-check effect above. If nothing confirms within 10
        // minutes, surface a neutral "taking longer than usual" state instead
        // (a real signal landing afterwards still wins — see that effect).
        const t1 = setTimeout(() => setStageIfCurrent(id, "routing", "executing"), 5000);
        const t2 = setTimeout(() => setStageIfCurrent(id, "executing", "delayed"), CONFIRMATION_TIMEOUT_MS);
        advanceTimers.current[id] = [t1, t2];

        await Promise.allSettled([fetchBalance(), refreshPosition(), fetchHistory()]);
      } catch (e) {
        console.error(`${args.kind} failed`, e);
        delete pendingConfirmations.current[id];
        setStage(id, "failed");
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [
      universalAccount,
      walletAddress,
      signMessage,
      signAuthorization,
      setStage,
      setStageIfCurrent,
      fetchBalance,
      refreshPosition,
      fetchHistory,
    ],
  );

  if (!ready) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center text-ink-faint">
        <span className="font-display text-lg italic">Everyield</span>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingHero
        onLogin={() => login({ loginMethods: ["email", "google"] })}
        ready={ready}
        authenticated={authenticated}
      />
    );
  }

  // "Everything you own, one number": the unified (spendable) balance PLUS the
  // on-chain savings position. `uaUsd` alone is what's available to deposit —
  // savings can't be re-deposited — so SaveCard keeps receiving `uaUsd`, while
  // the hero and money-map read the grand total.
  const uaUsd = balance?.totalAmountInUSD ?? 0;
  const savingsUsd = position ? Number(formatUnits(position.usdcValue, 6)) : 0;
  const totalUsd = uaUsd + savingsUsd;
  // Fail closed pre-first-read: until `position` resolves we don't know the
  // vault is idle, so Save/Withdraw stay disabled rather than briefly open.
  const fullyIdle = position ? position.fullyIdle : false;
  const checkingStatus = position === null;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <div className="flex items-center gap-2">
          <AccountButton address={owner} />
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="grid size-9 place-items-center rounded-full border border-line text-ink-soft outline-none transition-colors hover:text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <HeroBalance amount={totalUsd} loading={isLoadingBalance && !balance} />

      <div className="mt-5">
        <ChainBreakdown assets={balance?.assets} total={totalUsd} savings={savingsUsd} />
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <PositionCard
          ua={universalAccount}
          owner={owner}
          position={position}
          apy={apy}
          loading={positionLoading}
          busy={isSending}
          onSend={send}
        />
        <SaveCard
          ua={universalAccount}
          owner={owner}
          available={uaUsd}
          fullyIdle={fullyIdle}
          checkingStatus={checkingStatus}
          busy={isSending}
          onSend={send}
        />
        <ActivityFeed local={localActivity} history={history} loading={historyLoading} />
      </div>
    </div>
  );
}

function HeroBalance({ amount, loading }: { amount: number; loading: boolean }) {
  const animated = useCountUp(amount);
  const { dollars, cents } = splitUsd(animated);
  return (
    <div className="mt-10 text-center">
      <p className="font-display text-sm italic text-ink-faint">Total balance</p>
      {loading ? (
        <div className="mx-auto mt-3 ey-shimmer h-14 w-52 rounded-xl" />
      ) : (
        <p className="mt-2 font-display text-6xl leading-none tracking-[-0.02em] tnum text-ink sm:text-7xl">
          {dollars}
          <span className="text-3xl text-ink-faint sm:text-4xl">{cents}</span>
        </p>
      )}
      <p className="mt-3 text-sm text-ink-soft">Everything you own, one number.</p>
    </div>
  );
}

function AccountButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  if (!address) return null;
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 font-mono text-xs text-ink-soft outline-none transition-colors hover:text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
      {truncateAddress(address)}
    </button>
  );
}
