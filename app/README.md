# Universal Accounts with EIP-7702

A developer demo showcasing **EIP-7702 mode** with [Particle Network's Universal Accounts](https://developers.particle.network/universal-accounts/cha/overview) and [Privy](https://privy.io) authentication.

## What This Demo Shows

**EIP-7702** lets an EOA act directly as a Universal Account—no separate contract deployment or asset transfers required. Your existing wallet address gains Universal Account features instantly.

**Features demonstrated:**
- Unified balance view across EVM chains + Solana
- Swap/bridge tokens to any supported chain via [LI.FI](https://li.fi) for token discovery and Universal Account infrastructure for liquidity orchestration
- Withdraw USDC to external addresses
- Social login with Privy (email, Google, Twitter)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/soos3d/universal-accounts-7702
yarn install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your credentials:

```bash
# Particle Network - https://dashboard.particle.network
NEXT_PUBLIC_PROJECT_ID="your-particle-project-id"
NEXT_PUBLIC_CLIENT_KEY="your-particle-client-key"
NEXT_PUBLIC_APP_ID="your-particle-app-id"

# Privy - https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
NEXT_PUBLIC_PRIVY_CLIENT_ID="your-privy-client-id"
```

### 3. Run

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Production build |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |

## How EIP-7702 Mode Works

```
Traditional Smart Accounts:
EOA (0xABC...) → Deploy Smart Account (0xDEF...) → Transfer assets → Use features

EIP-7702 Mode:
EOA (0xABC...) → Sign authorization → EOA becomes Universal Account
```

**Key difference:** Same address, no transfers, zero friction.

### 1. Initialize Universal Account

```typescript
const ua = new UniversalAccount({
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
  projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
  smartAccountOptions: {
    useEIP7702: true,  // Enable 7702 mode
    ownerAddress: wallet.address,
  },
});
```

### 2. Create a Transaction

```typescript
const transaction = await ua.createUniversalTransaction({
  chainId: CHAIN_ID.BASE_MAINNET,
  expectTokens: [{ tokenAddress: USDC_ADDRESS, amount: "10" }],
  transactions: [{ to: recipient, data: "0x", value: "0" }],
});
```

### 3. Handle EIP-7702 Authorization

On first transaction per chain, the SDK returns `userOps` that need 7702 authorization. This demo uses Privy's `useSign7702Authorization` hook:

```typescript
// Check each userOp for required authorization
for (const userOp of transaction.userOps) {
  if (userOp.eip7702Auth && !userOp.eip7702Delegated) {
    // Sign with Privy's hook
    const auth = await signAuthorization({
      contractAddress: userOp.eip7702Auth.address,
      chainId: userOp.eip7702Auth.chainId,
      nonce: userOp.eip7702Auth.nonce,
    });

    // Serialize signature for SDK
    const sig = Signature.from({ r: auth.r, s: auth.s, yParity: auth.yParity });
    authorizations.push({
      userOpHash: userOp.userOpHash,
      signature: sig.serialized,
    });
  }
}
```

### 4. Sign and Send

```typescript
// Sign the transaction root hash
const { signature } = await signMessage({ message: transaction.rootHash });

// Send with authorizations
const result = await ua.sendTransaction(transaction, signature, authorizations);
```

### Key Points

- **First tx per chain:** Requires EIP-7702 authorization signature
- **Subsequent txs:** No re-authorization needed (`eip7702Delegated` will be `true`)
- **Signature format:** Privy returns `r, s, yParity`; SDK expects serialized hex via `ethers.Signature`

See [`lib/eip7702.ts`](./lib/eip7702.ts) for the full implementation.

## Supported Chains

**Chains supporting 7702:** Ethereum, Arbitrum, Base, Optimism, Polygon, BNB Chain, Sonic, Berachain

## Learn More

- [Universal Accounts Docs](https://developers.particle.network/universal-accounts/cha/overview)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Privy Docs](https://docs.privy.io)
- [LI.FI Docs](https://docs.li.fi)

## License

MIT
