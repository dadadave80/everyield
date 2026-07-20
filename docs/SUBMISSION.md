# Everyield — submission draft

> Encode UXMAXX Hackathon · **Universal Accounts Track (Particle Network)**

## Project name
**Everyield**

## One-liner
The savings account that doesn't know what a chain is — email in, one balance across chains, one Save button,
real Aave V3 yield.

## Description (~150 words)
Everyield turns a chain-agnostic savings account into a two-tap experience. You log in with an email; Privy
issues an embedded wallet, and under EIP-7702 that same key signs one authorization that upgrades it into a smart
account. A Particle Universal Account then presents everything you own across chains as a single spendable
balance. Tap **Save**, and your USDC lands in an ERC-4626 vault on Arbitrum One earning live Aave V3 yield — even
when the dollars started on another chain. Particle routes the entire cross-chain leg, so the contracts never
bridge. Every signature is preceded by an all-in fee quote, and withdrawals are partial or full.

The vault is three EIP-2535 diamonds assembled from the **Lattice** framework, consumed via
`forge install dadadave80/lattice` — including one custom facet (`EveryieldCrank`) cut into a stock diamond.
Live on Arbitrum One, verified, and rehearsed end-to-end with real funds.

## Track requirement checklist

| Requirement | Met? | Evidence |
| --- | --- | --- |
| Uses the Particle Universal Account SDK | Yes | `@particle-network/universal-account-sdk` **2.0.3** (exact) in `app/package.json`; initialized in `app/app/page.tsx` |
| EIP-7702 mode | Yes | `UniversalAccount({ smartAccountOptions: { useEIP7702: true, … } })`; the Privy embedded wallet signs the delegation via `useSign7702Authorization` |
| ≥1 cross-chain operation moving value | Yes | Live **$2.00 USDC deposit, Base → Arbitrum**, through the 7702 account (2026-07-20), all-in fee $0.36 |
| Functional demo | Yes | Working app (`app/`) + live mainnet contracts on Arbitrum One (`deployments/42161.json`) |
| Deployed & verified contracts | Yes | Three diamonds Etherscan-verified at deploy; Sourcify via `make verify-mainnet` |

## Links
- **Repo:** https://github.com/dadadave80/everyield (branch `feat/everyield-build`)
- **Live app:** `https://everyield.vercel.app`
- **Demo video:** `<VIDEO_URL>`
- **Contracts — Arbitrum One (chain 42161):**
  - Vault (`eyUSDC`): https://arbiscan.io/address/0x4aE34A2fA9efD143C0330c306dDF8808eE34815D
  - StrategyManager: https://arbiscan.io/address/0xcFf692A6cc69D868Bb1944d9269a233c01643Adc
  - AaveV3Adapter: https://arbiscan.io/address/0x9e104F4Ec391128Ad0cc101D2D1bB5Be6c02Dd02
  - Deployer: https://arbiscan.io/address/0xdadada4e8038641212262fd94e816d4a57cdc751
- **Framework:** https://github.com/dadadave80/lattice (pinned at v0.2.0)

## What makes it interesting
- **Framework, not fork.** The vault consumes Lattice as an installable dependency and extends it with a single
  app-specific facet (`EveryieldCrank`) — the intended way to build on a Diamond framework.
- **We found and engineered around a bug in our own framework.** Our Arbitrum-fork test caught a share-pricing
  composition bug in Lattice's `ERC4626Lib` (deposit/redeem price against idle-only assets while funds are
  deployed). The app fails closed around it — an interaction-window guard (Save/Withdraw only when fully idle)
  and full-NAV display pricing (`shares × totalAssets / totalSupply`, never `convertToAssets`) — and the exact
  behavior is pinned by a regression assertion. Upstream fix scoped for post-hackathon.
- **Mid-hackathon resilience.** Particle server-side decommissioned v1 universal accounts (ERR -32801); we
  upgraded the SDK 1.1.1 → 2.0.3, found and fixed a 1e18-hex fee-encoding display hazard, and calibrated fee
  semantics against live quotes.
- **Honest budget.** ~$2.10 of a $10 cap consumed (deploy ~$1.50, UA fees ~$0.50, keeper gas in cents).

## Team
**David Dada** — [@dadadave80](https://github.com/dadadave80)

## What we'd do next
1. **Upstream the `ERC4626Lib` fix** so share math sees the diamond's full-NAV `totalAssets` override, retiring
   the interaction-window guard.
2. **Automate the keeper** — move the rebalance/deploy crank and full recall from operator commands to Chainlink
   Automation / Gelato.
3. **Multi-vault** — support multiple assets and strategies behind the same one-balance, one-Save experience.
