import { Signature } from "ethers";

type EIP7702Authorization = {
  userOpHash: string;
  signature: string;
};

type UserOp = {
  userOpHash: string;
  eip7702Auth?: {
    address: string;
    chainId: number;
    nonce: number;
  };
  eip7702Delegated?: boolean;
};

type SignAuthorizationFn = (
  params: {
    contractAddress: `0x${string}`;
    chainId: number;
    nonce: number;
  },
  options: {
    address: string;
  }
) => Promise<{
  r: string;
  s: string;
  v?: bigint;
  yParity: number;
}>;

/**
 * Handles EIP-7702 authorization for user operations.
 * 
 * This function iterates through userOps and signs EIP-7702 authorizations
 * for any operations that require them. It caches signatures by nonce to
 * avoid duplicate signing for the same authorization.
 * 
 * @param userOps - Array of user operations from the transaction
 * @param signAuthorization - Privy's signAuthorization function
 * @param walletAddress - The embedded wallet address
 * @returns Array of EIP-7702 authorizations with signatures
 */
export async function handleEIP7702Authorizations(
  userOps: UserOp[],
  signAuthorization: SignAuthorizationFn,
  walletAddress: string
): Promise<EIP7702Authorization[]> {
  const authorizations: EIP7702Authorization[] = [];
  const nonceMap = new Map<number, string>();

  for (const userOp of userOps) {
    if (!!userOp.eip7702Auth && !userOp.eip7702Delegated) {
      let signatureSerialized = nonceMap.get(userOp.eip7702Auth.nonce);
      
      if (!signatureSerialized) {
        // Use Privy's signAuthorization hook which handles nonces properly
        const authorization = await signAuthorization(
          {
            contractAddress: userOp.eip7702Auth.address as `0x${string}`,
            chainId: Number(userOp.eip7702Auth.chainId),
            nonce: userOp.eip7702Auth.nonce,
          },
          {
            address: walletAddress,
          }
        );

        // Serialize the authorization signature (r, s, v components) into a hex string
        const sig = Signature.from({
          r: authorization.r,
          s: authorization.s,
          v: authorization.v ?? BigInt(authorization.yParity),
          yParity: authorization.yParity as 0 | 1,
        });
        signatureSerialized = sig.serialized;
        nonceMap.set(userOp.eip7702Auth.nonce, signatureSerialized);
      }

      if (signatureSerialized) {
        authorizations.push({
          userOpHash: userOp.userOpHash,
          signature: signatureSerialized,
        });
      }
    }
  }

  return authorizations;
}
