/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import {
  LOGO_URLS,
  chainIdMap,
  withdrawChainUSDCAddresses,
  withdrawChains,
} from "@/lib/utils";
import {
  UniversalAccount,
  SUPPORTED_TOKEN_TYPE,
} from "@particle-network/universal-account-sdk";
import { handleEIP7702Authorizations } from "@/lib/eip7702";
import { Interface, parseUnits } from "ethers";

interface TransferCardProps {
  universalAccount: UniversalAccount | null;
  totalBalance: number;
  isSending: boolean;
  onSendingChange: (sending: boolean) => void;
  onSuccess: (txHash: string) => void;
  onRefreshBalance: () => void;
  signMessage: (
    params: { message: string },
    options: { uiOptions: { title: string }; address: string },
  ) => Promise<{ signature: string }>;
  signAuthorization: (
    params: { contractAddress: `0x${string}`; chainId: number; nonce: number },
    options: { address: string },
  ) => Promise<{ r: string; s: string; v?: bigint; yParity: number }>;
  walletAddress: string;
  selectedChain: string;
  onChainChange: (chain: string) => void;
}

export function TransferCard({
  universalAccount,
  totalBalance,
  isSending,
  onSendingChange,
  onSuccess,
  onRefreshBalance,
  signMessage,
  signAuthorization,
  walletAddress,
  selectedChain,
  onChainChange,
}: TransferCardProps) {
  const [receiverAddress, setReceiverAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleMaxClick = () => {
    setAmount(totalBalance.toFixed(2));
  };

  const handleTransfer = async () => {
    if (!universalAccount || !receiverAddress || !amount || !walletAddress) {
      return;
    }

    if (!isValidAddress(receiverAddress)) {
      alert("Invalid Ethereum address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Invalid amount");
      return;
    }

    if (amountNum > totalBalance) {
      alert("Insufficient balance");
      return;
    }

    onSendingChange(true);
    setTransactionHash(null);

    try {
      const erc20Interface = new Interface([
        "function transfer(address to, uint256 amount) external returns (bool)",
      ]);

      const cleanAmount = amount.trim();
      const amount6 = parseUnits(cleanAmount, 6);

      const transaction = await universalAccount.createUniversalTransaction({
        chainId: chainIdMap[selectedChain],
        expectTokens: [
          {
            type: SUPPORTED_TOKEN_TYPE.USDC,
            amount: cleanAmount,
          },
        ],
        transactions: [
          {
            to: withdrawChainUSDCAddresses[selectedChain],
            data: erc20Interface.encodeFunctionData("transfer", [
              receiverAddress,
              amount6,
            ]),
          },
        ],
      });

      if (!transaction) {
        throw new Error("Failed to create universal transaction");
      }

      const authorizations = await handleEIP7702Authorizations(
        transaction.userOps,
        signAuthorization,
        walletAddress,
      );

      const { signature } = await signMessage(
        { message: transaction.rootHash },
        {
          uiOptions: {
            title: `Withdraw ${amount} USDC on ${selectedChain} to ${receiverAddress.slice(0, 6)}...${receiverAddress.slice(-4)}`,
          },
          address: walletAddress,
        },
      );

      const sendResult = await universalAccount.sendTransaction(
        transaction,
        signature,
        authorizations,
      );

      setTransactionHash(sendResult.transactionId || "Transaction submitted");
      onSuccess(sendResult.transactionId || "");

      setReceiverAddress("");
      setAmount("");
      onRefreshBalance();
    } catch (error) {
      console.error("Transfer failed:", error);
      alert(
        `Transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      onSendingChange(false);
    }
  };

  const getButtonText = () => {
    if (isSending) return "Processing...";
    if (!receiverAddress) return "Enter recipient address";
    if (!isValidAddress(receiverAddress)) return "Invalid address";
    if (!amount) return "Enter amount";
    return "Withdraw";
  };

  const isButtonDisabled =
    !receiverAddress ||
    !isValidAddress(receiverAddress) ||
    !amount ||
    parseFloat(amount) <= 0 ||
    parseFloat(amount) > totalBalance ||
    isSending;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="bg-white/5 rounded-xl p-5 mb-3 border border-white/10">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3 block">
          To Address
        </span>
        <input
          type="text"
          placeholder="0x..."
          value={receiverAddress}
          onChange={(e) => setReceiverAddress(e.target.value)}
          className="w-full bg-transparent text-lg font-medium focus:outline-none text-white placeholder:text-gray-600"
        />
        {receiverAddress && !isValidAddress(receiverAddress) && (
          <p className="text-sm text-red-400 mt-2">Invalid Ethereum address</p>
        )}
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <div className="bg-white/10 rounded-lg p-2 border border-white/20 backdrop-blur-sm">
          <ArrowDown className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-5 mt-3 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Amount
          </span>
          <button
            onClick={handleMaxClick}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-3xl font-semibold focus:outline-none text-white placeholder:text-gray-600"
          />
        </div>
        {amount && (
          <p className="text-sm text-gray-400 mt-2">
            ≈ ${parseFloat(amount).toFixed(2)}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Available: ${totalBalance.toFixed(2)}
        </p>
      </div>

      <div className="bg-white/5 rounded-xl p-5 mt-3 border border-white/10">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3 block">
          Destination Chain
        </span>
        <div className="flex items-center gap-3 w-full">
          <img
            src={LOGO_URLS[selectedChain]}
            alt={selectedChain}
            width={28}
            height={28}
            className="rounded-full"
          />
          <select
            value={selectedChain}
            onChange={(e) => onChainChange(e.target.value)}
            className="flex-1 bg-transparent text-lg font-medium text-white focus:outline-none appearance-none cursor-pointer"
          >
            {withdrawChains.map((chain) => (
              <option key={chain} value={chain} className="bg-gray-900">
                {chain}
              </option>
            ))}
          </select>
        </div>
      </div>
      </div>

      {/* Transfer Button - outside scroll area */}
      <Button
        onClick={handleTransfer}
        disabled={isButtonDisabled}
        className="w-full mt-4 shrink-0 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl transition-all duration-200 h-auto shadow-lg hover:shadow-purple-500/30 disabled:shadow-none"
      >
        {getButtonText()}
      </Button>
    </div>
  );
}
