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
const chainIdToName: Record<number, string> = {
  [CHAIN_ID.ETHEREUM_MAINNET]: "Ethereum",
  [CHAIN_ID.OPTIMISM_MAINNET]: "Optimism",
  [CHAIN_ID.ARBITRUM_MAINNET_ONE]: "Arbitrum",
  [CHAIN_ID.BASE_MAINNET]: "Base",
  [CHAIN_ID.BSC_MAINNET]: "BNB Chain",
  [CHAIN_ID.BERACHAIN_MAINNET]: "Berachain",
  [CHAIN_ID.SONIC_MAINNET]: "Sonic",
  [CHAIN_ID.POLYGON_MAINNET]: "Polygon",
  [CHAIN_ID.XLAYER_MAINNET]: "X Layer",
  [CHAIN_ID.SOLANA_MAINNET]: "Solana",
  [CHAIN_ID.AVALANCHE_MAINNET]: "Avalanche",
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
