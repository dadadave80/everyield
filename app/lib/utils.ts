import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CHAIN_ID } from "@particle-network/universal-account-sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const truncateAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

export const copyToClipboard = async (value?: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    console.error("Failed to copy address", error);
  }
};

export const LOGO_URLS: Record<string, string> = {
  // Chains
  Ethereum:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  Arbitrum:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  Base:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
  Polygon:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  "BNB Chain":
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
  Solana:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
  Optimism:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
  Avalanche:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  Linea:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png",
  Mantle:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/mantle/info/logo.png",
  Zora:
    "https://universalx.app/_next/image?url=https%3A%2F%2Fstatic.particle.network%2Fchains%2Fevm%2Ficons%2F999.png&w=32&q=75",
  "X Layer":
    "https://universalx.app/_next/image?url=https%3A%2F%2Fstatic.particle.network%2Fchains%2Fevm%2Ficons%2F196.png&w=32&q=75",
  Sonic:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sonic/info/logo.png",
  Berachain:
    "https://universalx.app/_next/image?url=https%3A%2F%2Fstatic.particle.network%2Fchains%2Fevm%2Ficons%2F80094.png&w=32&q=75",
  // Tokens
  ETH: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  USDC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  USDT: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
  BTC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
  SOL: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
  BNB: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
};

export const chainIdMap: Record<string, number> = {
  Ethereum: CHAIN_ID.ETHEREUM_MAINNET,
  Optimism: CHAIN_ID.OPTIMISM_MAINNET,
  Arbitrum: CHAIN_ID.ARBITRUM_MAINNET_ONE,
  Base: CHAIN_ID.BASE_MAINNET,
  "BNB Chain": CHAIN_ID.BSC_MAINNET,
  Berachain: CHAIN_ID.BERACHAIN_MAINNET,
  Sonic: CHAIN_ID.SONIC_MAINNET,
  Polygon: CHAIN_ID.POLYGON_MAINNET,
  "X Layer": CHAIN_ID.XLAYER_MAINNET,
  Solana: CHAIN_ID.SOLANA_MAINNET,
  Avalanche: CHAIN_ID.AVALANCHE_MAINNET,
};

export const withdrawChainUSDCAddresses: Record<string, string> = {
  Base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  Arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "BNB Chain": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
};

export const withdrawChains = Object.keys(withdrawChainUSDCAddresses);

export const availableAssets = ["USDC", "USDT", "ETH", "BTC", "SOL", "BNB"];
export const availableChains = Object.keys(chainIdMap);

// Supported chains for Universal Accounts (EIP-7702 mode)
export const SUPPORTED_CHAINS = [
  { name: "Ethereum", logo: LOGO_URLS.Ethereum, type: "evm" as const },
  { name: "Optimism", logo: LOGO_URLS.Optimism, type: "evm" as const },
  { name: "Arbitrum", logo: LOGO_URLS.Arbitrum, type: "evm" as const },
  { name: "Base", logo: LOGO_URLS.Base, type: "evm" as const },
  { name: "BNB Chain", logo: LOGO_URLS["BNB Chain"], type: "evm" as const },
  { name: "Berachain", logo: LOGO_URLS.Berachain, type: "evm" as const },
  { name: "Sonic", logo: LOGO_URLS.Sonic, type: "evm" as const },
  { name: "Polygon", logo: LOGO_URLS.Polygon, type: "evm" as const },
  { name: "X Layer", logo: LOGO_URLS["X Layer"], type: "evm" as const },
  { name: "Solana", logo: LOGO_URLS.Solana, type: "solana" as const },
];

export const EVM_SUPPORTED_CHAINS = SUPPORTED_CHAINS.filter(c => c.type === "evm");

// Transaction history utilities
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

export const getChainName = (chainId: number): string => {
  return chainIdToName[chainId] || `Chain ${chainId}`;
};

export const formatTransactionDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const transactionStatusMap: Record<number, { label: string; color: string }> = {
  7: { label: "Completed", color: "text-green-400" },
  1: { label: "Pending", color: "text-yellow-400" },
  2: { label: "Processing", color: "text-blue-400" },
  3: { label: "Confirming", color: "text-blue-400" },
  0: { label: "Failed", color: "text-red-400" },
};

export const getTransactionStatus = (status: number): { label: string; color: string } => {
  return transactionStatusMap[status] || { label: "Unknown", color: "text-gray-400" };
};

export const getTransactionTagLabel = (tag: string): string => {
  const tagMap: Record<string, string> = {
    convert: "Swap",
    transfer: "Transfer",
    bridge: "Bridge",
    deposit: "Deposit",
    withdraw: "Withdraw",
  };
  return tagMap[tag] || tag.charAt(0).toUpperCase() + tag.slice(1);
};
