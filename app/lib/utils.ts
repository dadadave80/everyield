import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CHAIN_ID } from "@particle-network/universal-account-sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const truncateAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

export const copyToClipboard = async (value?: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    console.error("Failed to copy", error);
  }
};

// Chain-id → human name. This is the ONLY surface where chains are ever named —
// used inside ChainBreakdown ("where your money physically lives"). The primary
// flow never speaks of a chain.
//
// SDK 2.x's CHAIN_ID enum was trimmed to the six chains a v2 Universal Account
// actually routes (Solana, Ethereum, BSC, Base, X Layer, Arbitrum). A unified
// balance can still hold dust on chains outside that set, so the now-missing
// members are kept here as numeric literals (their stable, unchanging chain
// ids) purely so a balance on one of them still renders a name instead of a
// raw "Chain <id>" fallback.
const chainIdToName: Record<number, string> = {
  [CHAIN_ID.ETHEREUM_MAINNET]: "Ethereum",
  10: "Optimism", // CHAIN_ID.OPTIMISM_MAINNET, removed from the v2 SDK enum
  [CHAIN_ID.ARBITRUM_MAINNET_ONE]: "Arbitrum",
  [CHAIN_ID.BASE_MAINNET]: "Base",
  [CHAIN_ID.BSC_MAINNET]: "BNB Chain",
  80094: "Berachain", // CHAIN_ID.BERACHAIN_MAINNET, removed from the v2 SDK enum
  146: "Sonic", // CHAIN_ID.SONIC_MAINNET, removed from the v2 SDK enum
  137: "Polygon", // CHAIN_ID.POLYGON_MAINNET, removed from the v2 SDK enum
  [CHAIN_ID.XLAYER_MAINNET]: "X Layer",
  [CHAIN_ID.SOLANA_MAINNET]: "Solana",
  43114: "Avalanche", // CHAIN_ID.AVALANCHE_MAINNET, removed from the v2 SDK enum
};

export const getChainName = (chainId: number): string =>
  chainIdToName[chainId] || `Chain ${chainId}`;

export const formatRelativeTime = (input: string | number): string => {
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
