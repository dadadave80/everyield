# Everyield — Design Spec

**Date:** 2026-07-18 · **Event:** Encode UXMAXX Hackathon, Universal Accounts Track (Particle Network) · **Finale:** 2026-07-22 16:00 GMT+1

## One-liner

A savings account that doesn't know what a chain is: log in with email, see one balance, press one
button — your USDC, wherever it physically lives, earns real Aave V3 yield inside a Lattice vault
diamond on Arbitrum One.

## Track requirements (must all hold)

1. Universal Accounts SDK (`@particle-network/universal-account-sdk@2.0.3`) in **EIP-7702 mode**
   (`smartAccountOptions.useEIP7702: true`) — the user's EOA *is* the account; Privy embedded wallet
   signs the 7702 authorization (JSON-RPC wallets cannot).
2. **≥1 cross-chain operation moving value via UA** — the core deposit: USDC held on Base funds a
   `deposit` executed on Arbitrum One.
3. **Functional demo** — deployed app (Vercel) + verified mainnet contracts + live walkthrough.

## Locked decisions

| Decision | Value |
|---|---|
| Concept | One-click universal yield (deposit from any chain into a yield vault) |
| Track posture | UA Track, built to General-Track UX standard |
| Destination chain | Arbitrum One (hackathon sponsor; deep Aave V3 USDC market) |
| Demo-funds chain | Base (USDC + ETH primary assets) |
| Embedded wallet | Privy (Particle's official 7702 scaffold uses it) |
| Name | Everyield (`eyUSDC` shares) |
| Team | Solo (David) + Claude building contracts and frontend |
| Budget | **$10 hard max**: ~$3 ETH on Arbitrum One (deploy measured at 29.2M gas ≈ $1–2, + cranks) and ~$4–5 USDC float on Base that round-trips back after the demo. True burn ≈ $3–6 (gas + UA routing fees); `feeQuotes` is checked before every send, so UA fees are visible pre-commit |
| Repo shape | This repo (`everyield`) is a Foundry project that **`forge install`s Lattice** + an `app/` Next.js frontend. All hackathon Solidity lives here; nothing lands in the Lattice repo during the hackathon |

## On-chain architecture (Arbitrum One)

Two diamonds, assembled from `forge install`ed Lattice facets — the hackathon repo demonstrates
Lattice as an installable framework:

1. **Vault diamond** — Lattice's existing `DeployVaultCore` recipe (imported from the lib):
   ERC-20 shares (`eyUSDC`) + ERC-4626 + VaultCore strategy hooks + AccessControl + Loupe/Cut +
   ERC-165. Asset: native Arbitrum USDC `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`.
   Consumer surface: `deposit(assets, receiver)` / `redeem(shares, receiver, owner)`.
2. **Aave V3 adapter diamond** — the one substantive new Solidity: `DeployAaveV3Adapter.s.sol`
   (~40 lines) mirroring Lattice's `DeployAggregatorExecAdapter` recipe and the `AaveV3AdapterFork`
   init: `__AaveV3Adapter_init(poolAddressesProvider, USDC, vault, rewardRecipient, dummyFeedKey,
   1e18)`. Arbitrum `PoolAddressesProvider`: `0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb`
   (re-verify against Aave address book at build time).
3. **Allocation** — resolved at plan time: the **StrategyManager diamond is required** (three
   diamonds total). `VaultCore.totalAssets()` prices shares by staticcalling the manager's
   `totalAllocated()`, and the adapter's operator gate must match the rebalance caller — so the
   manager diamond is both the vault's manager and the adapter's operator, extended with a small
   `EveryieldCrank` facet (admin-gated `crankDeploy`) so the operator can trigger the adapter's
   `deploy()`. Keeper crank = permissionless `rebalance()` + `crankDeploy`. Target 8000 bps to the
   strategy — **20% of TVL stays idle** so small redeems never block on a recall.
4. **Tests** — Arbitrum-fork round trip: USDC → `deposit` → allocate → aToken balance grows →
   `redeem` pays out. Adapted from Lattice's `AaveV3AdapterFork` suite.
5. **Deploys** — `forge script --broadcast --verify` (per standing rule, every public deploy is
   verified); broadcast JSON kept as evidence.

## Cross-chain leg (Particle UA)

- Deposit = one universal transaction on chain 42161:
  `transactions: [USDC.approve(vault, amt), vault.deposit(amt, userEOA)]`,
  `expectTokens: [{type: USDC, amount}]` — funded from the unified balance (demo: Base), gas fully
  abstracted, batched approve+call.
- First transaction per chain carries the EIP-7702 authorization: Privy's
  `useSign7702Authorization` signs `{address, chainId, nonce}`; serialized sig passed as
  `sendTransaction(tx, rootHashSig, [{userOpHash, signature}])`.
- Shares land on the login EOA (7702 mode: EOA == account). Withdrawal is the mirror universal
  transaction calling `redeem`.

## Frontend (`app/`, Next.js on Vercel, **bun** as package manager/runner)

Base: Particle's official `Particle-Network/universal-accounts-7702` scaffold (Privy + UA SDK +
ethers v6), reworked for design quality (frontend-design skill at build time). Three screens, no
chain name in the primary flow:

1. **Login** — email/social via Privy; 7702 upgrade silent.
2. **Home** — one unified-balance number (`getPrimaryAssets`); vault position
   (`convertToAssets(shares)`) with live Aave APY (read `getReserveData` liquidityRate via viem);
   one primary action: amount → fee-transparent preview (`feeQuotes` totals shown honestly) →
   Save. Collapsible "where your money physically lives" per-chain breakdown makes the abstraction
   legible to judges.
3. **Activity** — staged progress for cross-chain settlement (latency undocumented → measured in
   rehearsal, waiting state designed around the measurement), universalx.app receipts.

## Evidence & submission package

Live Vercel URL · this repo (contracts + app) · Lattice repo linked as the installed framework ·
Arbiscan-verified diamonds · broadcast logs · 2–3 min scripted video (login → save → verify on
Arbiscan/Aave → withdraw).

## Risks & fallbacks

| Risk | Mitigation |
|---|---|
| Privy 7702 authorization flow (non-negotiable: track requires 7702 mode) | Official scaffold as the base; boot it Day 0/1 before anything else |
| UA latency / minimum amounts undocumented | ~$5 dust test Day 2; two full rehearsals Day 3; staged progress UI |
| Aave wiring drags | Day-3 gate: ship receipt-vault-only, present adapter as wired-but-unallocated |
| Live-demo failure at finale | Rehearsed video as primary artifact; live run as the encore |

## Schedule

| Day | Milestone |
|---|---|
| Fri 18 (rest of day) | Spec + implementation plan locked; Particle + Privy keys; scaffold boots; David funds demo EOA (~$15 USDC on Base, gas ETH on Arbitrum) |
| Sat 19 | Aave recipe + fork tests green; both diamonds deployed + verified on Arbitrum One; frontend login + unified balance |
| Sun 20 | First live dust deposit end-to-end; withdraw path; crank; UI feature-complete |
| Mon 21 | Design-polish pass; APY display; two full rehearsals; waiting-state tuning |
| Tue 22 | Video, submission copy, evidence package; finale 16:00 GMT+1 — morning is buffer |

## Stretch (talking points only, not build items)

Sibling vault on Base with CCTP-hook rebalancing (Lattice's CCTP adapter) as protocol roadmap;
Lattice `GovernedVault` as the decentralization story.
