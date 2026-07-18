# Everyield Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a chain-abstracted savings dApp — Particle Universal Accounts (EIP-7702, Privy) moving USDC from any chain into a three-diamond Lattice vault stack on Arbitrum One earning real Aave V3 yield — with a polished Next.js frontend, by the UXMAXX finale (2026-07-22 16:00 GMT+1).

**Architecture:** Three Lattice diamonds on Arbitrum One (ERC-4626 vault, StrategyManager + custom `EveryieldCrank` facet, AaveV3Adapter). The cross-chain leg is entirely Particle UA (`createUniversalTransaction` batching `approve` + `deposit`). Frontend is Particle's official 7702 scaffold rebuilt into three screens.

**Tech Stack:** Foundry (solc ≥0.8.30) · `forge install dadadave80/lattice` · Next.js 15 App Router + React 19 + Tailwind v4 (**bun**, not yarn) · `@particle-network/universal-account-sdk` ^2.0.3 · `@privy-io/react-auth` ^3.10 · ethers v6 (no viem — reads use ethers too).

## Global Constraints

- Package manager/runner for `app/`: **bun** (`bun install`, `bun dev`, `bun run build`, `bun test`).
- Foundry `solc >= 0.8.30` (Lattice sources are `pragma solidity ^0.8.30`); `ffi = true` (needed by the string-cut path for `AaveV3Adapter`, which has no `exportSelectors()`).
- Particle UA is **mainnet-only**; 7702 mode requires the Privy embedded wallet. Demo funds live on **Base**; contracts on **Arbitrum One (42161)**.
- Budget ceiling **$10–25 total** (≈$15 USDC demo funds + gas). Rehearsals recycle the same USDC via round trips.
- Every mainnet `forge script --broadcast` includes `--verify --verifier sourcify` (Sourcify: no API key; re-run with `--resume --verify --verifier sourcify` if verification is missed — never redeploy). Verification evidence links use `https://repo.sourcify.dev/contracts/full_match/42161/<address>/` (Arbiscan's own green check is Etherscan-family and will NOT reflect Sourcify).
- All commits GPG-signed (run git with sandbox disabled). Conventional Commit messages.
- No chain names in the primary UI flow. No `ponytail:` comments in code.
- Deployer key via Foundry keystore `--account` flag — never a raw private key in env or shell history.
- Vault allocation policy: `targetBps = 8000` (80% Aave / 20% idle buffer).

**Key facts extracted from Lattice (trust these; they were read from source):**
- `VaultCoreInit.init(address asset_, string name_, string symbol_, address admin_, uint8 decimalsOffset_)` initializes AccessControl + ERC20 + ERC4626 + VaultCore in one call.
- `VaultCore.totalAssets()` staticcalls `strategyManager.totalAllocated()` and **silently returns idle-only if it fails** → the manager MUST be the StrategyManager diamond, never an EOA.
- `VaultCore.allocateToStrategy(strategy, amount)` = raw ERC-20 push, callable only by the stored manager. `recallFromStrategy` only emits — recalls really happen when the manager calls `IStrategy.withdraw(amount, vault)`.
- `StrategyManagerInit.init(address admin)`. Admin-gated: `setVault(address)`, `addStrategy(address strategy, uint16 targetBps)`, `updateStrategyTarget(address,uint16)`. Permissionless: `rebalance()` (pass 1 recalls excess via `IStrategy.withdraw(...)` — msg.sender is the manager; pass 2 pushes deficit via `vault.allocateToStrategy`), `harvest()` (emit-only).
- `AaveV3Adapter` facet: `deploy()`/`withdraw(amount,to)`/`harvest()` are **operator-only** (`_checkOperator`, exact-address match); `setOperator(address)` is DEFAULT_ADMIN_ROLE; `withdraw`'s `to` MUST equal the pinned `_vault`; `deploy()` supplies the adapter's entire idle USDC into Aave; `totalAssetsManaged() = aToken balance + idle` (no debt). **Operator must be the manager diamond** (for rebalance recalls) → `deploy()` is reachable only via our `EveryieldCrank` facet cut into the manager.
- `AaveV3AdapterLib.__AaveV3Adapter_init(provider, asset_, vault_, rewardRecipient_, assetUsdFeedKey, minHealthFactorWad)` — must run inside the diamond-init window after `__AccessControl_init`; reverts unless the asset is listed on the resolved Aave pool (built-in address validation). `assetUsdFeedKey` is legacy/unused → pass `bytes32(0)`. `minHealthFactorWad >= 1e18`.
- No `AaveV3AdapterInit` contract exists in Lattice and `AaveV3Adapter` has **no `exportSelectors()`** → we write the init, and cut it with BaseDeploy's FFI path `_cut(facet, "AaveV3Adapter")`.
- BaseDeploy helpers: `_cut(address)` (ERC-8153), `_cut(address, string)` (FFI), `_assemble(cuts, init, initCalldata)`, `_withUpgradeableIntrospection(moduleInit, moduleCalldata)`.
- Consumer remappings (forge install pulls `lib/lattice` incl. `script/` + `test/` + nested `lib/diamond-lib`):
  `@lattice/=lib/lattice/src/`, `@lattice-script/=lib/lattice/script/`, `@lattice-test/=lib/lattice/test/`, `@diamond/=lib/lattice/lib/diamond-lib/src/`, `forge-std/=lib/forge-std/src/`.
- Addresses: Arbitrum native USDC `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (confirmed twice: Lattice research + Particle scaffold). Aave V3 Arbitrum `PoolAddressesProvider` `0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb` — NOT repo-sourced; Task 3's fork init revert-check validates it on-chain before any mainnet use.
- Scaffold (`Particle-Network/universal-accounts-7702`, cloned at `<scratchpad>/ua7702`): Next 15.5.7 App Router; `app/layout.tsx` = PrivyProvider (`NEXT_PUBLIC_PRIVY_APP_ID`/`NEXT_PUBLIC_PRIVY_CLIENT_ID`, embedded wallet `createOnLogin: "all-users"`); `app/page.tsx` = UA init (`useEIP7702: true`, env `NEXT_PUBLIC_PROJECT_ID`/`NEXT_PUBLIC_CLIENT_KEY`/`NEXT_PUBLIC_APP_ID`); `lib/eip7702.ts` = `handleEIP7702Authorizations(userOps, signAuthorization, walletAddress)` (keep verbatim); tx pattern = `createUniversalTransaction` → `signMessage(rootHash)` → `sendTransaction(tx, sig, authorizations)`; UA SDK pinned `^1.0.24` there — we upgrade to `^2.0.3` (shapes verified identical; if runtime drift appears, pin back to `^1.0.24` and note it).

---

### Task 1: Foundry consumer repo scaffold

**Files:**
- Create: `foundry.toml`, `remappings.txt`, `.gitignore`, `.env.example`, `test/Smoke.t.sol`
- Create (via forge): `lib/forge-std`, `lib/lattice`

**Interfaces:**
- Produces: a compiling Foundry project where `@lattice/*`, `@lattice-script/*`, `@diamond/*` imports resolve. All later Solidity tasks depend on it.

- [ ] **Step 1: Init + install** (run in `/Users/dadadave/Dev/projects/everyield`)

```bash
forge init --no-git --no-commit --force .   # keeps existing git repo + docs/
rm -rf src/Counter.sol script/Counter.s.sol test/Counter.t.sol
forge install foundry-rs/forge-std dadadave80/lattice
```
Expected: `lib/lattice` present with `lib/lattice/lib/diamond-lib` populated (recursive). If diamond-lib is empty: `git -C lib/lattice submodule update --init --recursive`.

- [ ] **Step 2: Write `foundry.toml`**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.30"
optimizer = true
optimizer_runs = 1_000_000
ffi = true                      # BaseDeploy string-cut path (AaveV3Adapter has no exportSelectors)
fs_permissions = [{ access = "read", path = "out" }]

[rpc_endpoints]
arbitrum = "${ARBITRUM_RPC_URL}"
base = "${BASE_RPC_URL}"

# Verification uses Sourcify (no API key): forge script ... --verify --verifier sourcify
```

- [ ] **Step 3: Write `remappings.txt`**

```
@lattice/=lib/lattice/src/
@lattice-script/=lib/lattice/script/
@lattice-test/=lib/lattice/test/
@diamond/=lib/lattice/lib/diamond-lib/src/
forge-std/=lib/forge-std/src/
```

- [ ] **Step 4: Write `.env.example`** (and `.gitignore`: `out/`, `cache/`, `.env`, `app/node_modules/`, `app/.next/`, `app/.env*.local`, `broadcast/**/dry-run/`)

```bash
ARBITRUM_RPC_URL="https://arbitrum-one.public.blastapi.io"   # archive-capable; serves fork test too
BASE_RPC_URL="https://mainnet.base.org"
KEYSTORE_ACCOUNT=""             # Foundry keystore name (cast wallet list) — never a raw key
```

- [ ] **Step 5: Write the smoke test `test/Smoke.t.sol`** — proves the install + remappings compile and lattice facets construct:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {VaultCore} from "@lattice/defi/VaultCore.sol";
import {StrategyManager} from "@lattice/defi/StrategyManager.sol";
import {AaveV3Adapter} from "@lattice/defi/AaveV3Adapter.sol";
import {Test} from "forge-std/Test.sol";

contract SmokeTest is Test {
    function test_LatticeFacetsConstruct() public {
        assertTrue(address(new VaultCore()).code.length > 0);
        assertTrue(address(new StrategyManager()).code.length > 0);
        assertTrue(address(new AaveV3Adapter()).code.length > 0);
    }
}
```

- [ ] **Step 6: Run** `forge test --match-contract SmokeTest -vv` → PASS (3 constructions).
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: Foundry scaffold consuming lattice via forge install"` (sandbox off, signed — applies to every commit step below).

---

### Task 2: Contracts — `EveryieldAaveInit`, `EveryieldCrank`, `DeployEveryield` recipe

**Files:**
- Create: `src/EveryieldAaveInit.sol`, `src/EveryieldCrank.sol`, `script/DeployEveryield.s.sol`
- Test: `test/DeployEveryield.t.sol` (local-EVM assembly of vault+manager; adapter is fork-only)

**Interfaces:**
- Consumes: Task 1's project; lattice imports listed in Global Constraints.
- Produces: `DeployEveryield.run(address admin) returns (address vault, address manager, address adapter)` — single-broadcast deploy+wire of all three diamonds. `EveryieldCrank.crankDeploy(address adapter)` (DEFAULT_ADMIN_ROLE) on the manager diamond. Task 3/4/8 depend on these exact names.

- [ ] **Step 1: Write `src/EveryieldAaveInit.sol`** (mirrors `VaultCoreInit` structure — plain init, NO pre/postInitializer of its own):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {InitializableLib} from "@diamond/libraries/InitializableLib.sol";
import {AccessControlLib} from "@lattice/access/libraries/AccessControlLib.sol";
import {AaveV3AdapterLib} from "@lattice/defi/libraries/AaveV3AdapterLib.sol";
import {ReentrancyGuardLib} from "@lattice/security/libraries/ReentrancyGuardLib.sol";

/// @title EveryieldAaveInit
/// @notice One-shot initializer for the Everyield Aave V3 adapter diamond.
contract EveryieldAaveInit {
    function init(address admin_, address provider_, address asset_, address vault_, address rewardRecipient_)
        external
    {
        AccessControlLib.__AccessControl_init(admin_);
        ReentrancyGuardLib.__ReentrancyGuard_init();
        AaveV3AdapterLib.__AaveV3Adapter_init(provider_, asset_, vault_, rewardRecipient_, bytes32(0), 1e18);
    }
}
```

- [ ] **Step 2: Write `src/EveryieldCrank.sol`** — the extra facet cut into the *manager* diamond so the operator (= manager) can ever call the adapter's operator-gated `deploy()`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlLib, DEFAULT_ADMIN_ROLE} from "@lattice/access/libraries/AccessControlLib.sol";
import {IProtocolAdapter} from "@lattice/interfaces/defi/IProtocolAdapter.sol";

/// @title EveryieldCrank
/// @notice Manager-diamond facet: pushes the adapter's idle USDC into Aave. The adapter's operator
///         is the manager diamond (required for rebalance recalls), so this call must originate here.
contract EveryieldCrank {
    function crankDeploy(address adapter) external returns (uint256 deployed) {
        AccessControlLib.checkRole(DEFAULT_ADMIN_ROLE);
        deployed = IProtocolAdapter(adapter).deploy();
    }

    /// @notice ERC-8153 export so BaseDeploy's `_cut(address)` works on this facet.
    function exportSelectors() external pure returns (bytes memory) {
        return abi.encodePacked(EveryieldCrank.crankDeploy.selector);
    }
}
```

- [ ] **Step 3: Write `script/DeployEveryield.s.sol`** — one broadcast: 3 diamonds + wiring. Vault cuts are copied verbatim from lattice's `DeployVaultCore` (selector surgery included); manager cuts add `EveryieldCrank`; adapter uses the FFI string cut:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {DiamondLoupeFacet} from "@diamond/facets/DiamondLoupeFacet.sol";
import {ERC165Facet} from "@diamond/facets/ERC165Facet.sol";
import {FacetCut} from "@diamond/libraries/DiamondLib.sol";
import {DeployVaultCore} from "@lattice-script/base/defi/DeployVaultCore.s.sol";
import {AccessControl} from "@lattice/access/AccessControl.sol";
import {AaveV3Adapter} from "@lattice/defi/AaveV3Adapter.sol";
import {StrategyManager} from "@lattice/defi/StrategyManager.sol";
import {StrategyManagerInit} from "@lattice/defi/StrategyManagerInit.sol";
import {AccessControlDiamondCut} from "@lattice/governance/AccessControlDiamondCut.sol";
import {IAdapterOperator} from "@lattice/interfaces/defi/IAdapterOperator.sol";
import {IStrategyManager} from "@lattice/interfaces/defi/IStrategyManager.sol";
import {IVaultCore} from "@lattice/interfaces/defi/IVaultCore.sol";
import {EveryieldAaveInit} from "../src/EveryieldAaveInit.sol";
import {EveryieldCrank} from "../src/EveryieldCrank.sol";

/// @dev Inherits DeployVaultCore so the vault recipe (incl. its selector surgery) is reused, not copied.
///      The inherited `buildCuts(asset_, name_, symbol_, admin_, decimalsOffset_)` builds the vault cuts.
contract DeployEveryield is DeployVaultCore {
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;        // Arbitrum native USDC
    address constant AAVE_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb; // Aave V3 Arbitrum
    uint16 constant TARGET_BPS = 8000;                                          // 80% Aave / 20% idle

    // ---- manager (lattice DeployStrategyManager shape + our crank facet) ----
    function buildManagerCuts(address admin_)
        public
        returns (FacetCut[] memory cuts, address init, bytes memory initCalldata)
    {
        cuts = new FacetCut[](6);
        cuts[0] = _cut(address(new ERC165Facet()));
        cuts[1] = _cut(address(new AccessControl()));
        cuts[2] = _cut(address(new StrategyManager()));
        cuts[3] = _cut(address(new EveryieldCrank()));
        cuts[4] = _cut(address(new DiamondLoupeFacet()));
        cuts[5] = _cut(address(new AccessControlDiamondCut()));
        (init, initCalldata) = _withUpgradeableIntrospection(
            address(new StrategyManagerInit()), abi.encodeCall(StrategyManagerInit.init, (admin_))
        );
    }

    // ---- adapter (FFI string cut: AaveV3Adapter has no exportSelectors) ----
    function buildAdapterCuts(address admin_, address vault_)
        public
        returns (FacetCut[] memory cuts, address init, bytes memory initCalldata)
    {
        cuts = new FacetCut[](5);
        cuts[0] = _cut(address(new ERC165Facet()));
        cuts[1] = _cut(address(new AccessControl()));
        cuts[2] = _cut(address(new AaveV3Adapter()), "AaveV3Adapter");
        cuts[3] = _cut(address(new DiamondLoupeFacet()));
        cuts[4] = _cut(address(new AccessControlDiamondCut()));
        (init, initCalldata) = _withUpgradeableIntrospection(
            address(new EveryieldAaveInit()),
            abi.encodeCall(EveryieldAaveInit.init, (admin_, AAVE_PROVIDER, USDC, vault_, admin_))
        );
    }

    /// @notice Deploys and wires the whole stack in one broadcast. `admin` = deployer EOA.
    function deployAll(address admin) public returns (address vault, address manager, address adapter) {
        FacetCut[] memory cuts;
        address init;
        bytes memory cd;

        (cuts, init, cd) = buildCuts(USDC, "Everyield USDC Vault", "eyUSDC", admin, 0); // inherited
        vault = _assemble(cuts, init, cd);
        (cuts, init, cd) = buildManagerCuts(admin);
        manager = _assemble(cuts, init, cd);
        (cuts, init, cd) = buildAdapterCuts(admin, vault);
        adapter = _assemble(cuts, init, cd);

        IVaultCore(vault).setStrategyManager(manager);
        IStrategyManager(manager).setVault(vault);
        IStrategyManager(manager).addStrategy(adapter, TARGET_BPS);
        IAdapterOperator(adapter).setOperator(manager);
    }

    function run(address admin) external returns (address vault, address manager, address adapter) {
        vm.startBroadcast();
        (vault, manager, adapter) = deployAll(admin);
        vm.stopBroadcast();
    }
}
```

- [ ] **Step 4: Write `test/DeployEveryield.t.sol`** — local-EVM check that vault+manager assemble and wire (the adapter init needs a live Aave pool → fork-only, Task 3):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Diamond} from "@diamond/Diamond.sol";
import {FacetCut} from "@diamond/libraries/DiamondLib.sol";
import {IStrategyManager} from "@lattice/interfaces/defi/IStrategyManager.sol";
import {IVaultCore} from "@lattice/interfaces/defi/IVaultCore.sol";
import {Test} from "forge-std/Test.sol";
import {MockERC20} from "forge-std/mocks/MockERC20.sol";
import {DeployEveryield} from "../script/DeployEveryield.s.sol";

contract DeployEveryieldTest is Test {
    function test_VaultAndManagerAssembleAndWire() public {
        DeployEveryield d = new DeployEveryield();
        MockERC20 usdc = new MockERC20();
        usdc.initialize("Mock USDC", "USDC", 6);

        (FacetCut[] memory cuts, address init, bytes memory cd) =
            d.buildCuts(address(usdc), "Everyield USDC Vault", "eyUSDC", address(this), 0);
        address vault = _assembleLocal(cuts, init, cd);
        (cuts, init, cd) = d.buildManagerCuts(address(this));
        address manager = _assembleLocal(cuts, init, cd);

        // msg.sender for the wiring is this test == the admin passed to the inits.
        IVaultCore(vault).setStrategyManager(manager);
        IStrategyManager(manager).setVault(vault);
        assertEq(IVaultCore(vault).strategyManager(), manager);
        assertEq(IVaultCore(vault).idleAssets(), 0);
    }

    function _assembleLocal(FacetCut[] memory cuts, address init, bytes memory cd) internal returns (address) {
        Diamond diamond = new Diamond();
        diamond.initialize(cuts, init, cd);
        return address(diamond);
    }
}
```

- [ ] **Step 5: Run** `forge build` → compiles clean; `forge test --match-contract DeployEveryieldTest -vv` → PASS.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: Everyield diamonds — Aave init, crank facet, single-broadcast deploy recipe"`.

---

### Task 3: Arbitrum fork test — full money round trip

**Files:**
- Test: `test/EveryieldFork.t.sol`

**Interfaces:**
- Consumes: `DeployEveryield.deployAll(admin)` (broadcast-free), `EveryieldCrank.crankDeploy(adapter)`, `IStrategyManager.rebalance()`.
- Produces: proof the exact mainnet sequence works; also validates `AAVE_PROVIDER` on-chain (init reverts `AaveV3AdapterReserveNotListed` if wrong).

- [ ] **Step 1: Pin a fork block**: `source .env 2>/dev/null; cast block-number --rpc-url "$ARBITRUM_RPC_URL"` → use that number minus ~100 as `FORK_BLOCK`.
- [ ] **Step 2: Write `test/EveryieldFork.t.sol`**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Diamond} from "@diamond/Diamond.sol";
import {FacetCut} from "@diamond/libraries/DiamondLib.sol";
import {IAdapterOperator} from "@lattice/interfaces/defi/IAdapterOperator.sol";
import {IStrategyManager} from "@lattice/interfaces/defi/IStrategyManager.sol";
import {IVaultCore} from "@lattice/interfaces/defi/IVaultCore.sol";
import {IERC20} from "@lattice/interfaces/tokens/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {DeployEveryield} from "../script/DeployEveryield.s.sol";
import {EveryieldCrank} from "../src/EveryieldCrank.sol";

interface IERC4626Like {
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToAssets(uint256) external view returns (uint256);
}

contract EveryieldForkTest is Test {
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    uint256 constant FORK_BLOCK = 0; // SET IN STEP 1

    address vault;
    address manager;
    address adapter;
    address user = address(0xBEEF);

    function setUp() public {
        string memory rpc = vm.envOr("ARBITRUM_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork("arbitrum", FORK_BLOCK);
        // Assemble + wire with THIS TEST as admin. (Do NOT call d.deployAll here: outside broadcast,
        // deployAll's wiring calls originate from the script contract, which is not the admin —
        // checkRole would revert. deployAll's broadcast path is exercised by Task 4's dry run.)
        DeployEveryield d = new DeployEveryield();
        FacetCut[] memory cuts;
        address init;
        bytes memory cd;
        (cuts, init, cd) = d.buildCuts(USDC, "Everyield USDC Vault", "eyUSDC", address(this), 0);
        vault = _assembleLocal(cuts, init, cd);
        (cuts, init, cd) = d.buildManagerCuts(address(this));
        manager = _assembleLocal(cuts, init, cd);
        (cuts, init, cd) = d.buildAdapterCuts(address(this), vault);
        adapter = _assembleLocal(cuts, init, cd); // EveryieldAaveInit validates the Aave provider here
        IVaultCore(vault).setStrategyManager(manager);
        IStrategyManager(manager).setVault(vault);
        IStrategyManager(manager).addStrategy(adapter, 8000);
        IAdapterOperator(adapter).setOperator(manager);
        deal(USDC, user, 100e6); // forge-std deal; if the balance assert below fails, switch to a
                                 // whale prank (top holder from Arbiscan) — do NOT fight stdStorage.
        assertEq(IERC20(USDC).balanceOf(user), 100e6, "deal worked");
    }

    function test_DepositCrankEarnRedeem() public {
        // 1. user deposits 100 USDC
        vm.startPrank(user);
        IERC20(USDC).approve(vault, 100e6);
        uint256 shares = IERC4626Like(vault).deposit(100e6, user);
        vm.stopPrank();
        assertGt(shares, 0, "shares minted");
        assertEq(IVaultCore(vault).idleAssets(), 100e6, "all idle pre-crank");

        // 2. crank: rebalance pushes 80 USDC to adapter, crankDeploy supplies it into Aave
        IStrategyManager(manager).rebalance();
        EveryieldCrank(manager).crankDeploy(adapter);
        assertEq(IVaultCore(vault).idleAssets(), 20e6, "20% buffer stays idle");
        assertApproxEqAbs(IERC4626Like(vault).totalAssets(), 100e6, 2, "shares fully backed");

        // 3. yield accrues (time travel makes it visible)
        vm.warp(block.timestamp + 30 days);
        assertGt(IERC4626Like(vault).totalAssets(), 100e6, "Aave interest accrued");

        // 4. small redeem inside the idle buffer — instant
        vm.prank(user);
        uint256 got = IERC4626Like(vault).redeem(shares / 10, user, user);
        assertGt(got, 0, "partial redeem paid from idle");

        // 5. full exit: rebalance recalls from Aave (manager calls adapter.withdraw -> vault), then redeem
        IStrategyManager(manager).rebalance();
        uint256 rest = IERC4626Like(vault).balanceOf(user);
        vm.prank(user);
        uint256 finalOut = IERC4626Like(vault).redeem(rest, user, user);
        assertGt(finalOut, 0, "final redeem");
        assertGt(IERC20(USDC).balanceOf(user), 100e6 - 1e6, "user got principal (+yield) back");
    }

    function _assembleLocal(FacetCut[] memory cuts, address init, bytes memory cd) internal returns (address) {
        Diamond diamond = new Diamond();
        diamond.initialize(cuts, init, cd);
        return address(diamond);
    }
}
```
NOTE for implementer on step 5's recall math: after the partial redeem, `totalAssets` shrinks, so the 80% target is above the adapter's holding only if assets grew — a second `rebalance()` recalls **excess** (current > target) to the vault. If the final `redeem` still reverts on idle shortfall, set the target lower first (admin): `IStrategyManager(manager).updateStrategyTarget(adapter, 0); IStrategyManager(manager).rebalance();` — that force-recalls everything; assert then. Encode whichever sequence passes as the canonical "full exit" and mirror it in Task 8's Makefile `exit` target.

- [ ] **Step 3: Run red→green**: `forge test --match-contract EveryieldForkTest -vvv`. First run may fail on `FORK_BLOCK = 0` (set it), `deal` (switch to whale prank), or recall math (apply the note). Iterate until PASS. This test passing == the provider address, the wiring, and the full UX money path are all proven.
- [ ] **Step 4: Commit** `git add -A && git commit -m "test: Arbitrum fork round trip — deposit, crank, yield, redeem"`.

---

### Task 4a: Testnet dress rehearsal — Arbitrum Sepolia  ⚠️ USER GATE (testnet gas)

Validates the real broadcast path (`runCustom` with the EOA as sender, all wiring) and the Sourcify
verification flow at zero cost. Contracts only — Particle UA has no testnet support.

Verified addresses (bgd-labs/aave-address-book v4.60.0, each confirmed on-chain via `cast` —
`getPool()` resolves and `getReserveData(USDC).aTokenAddress` is non-zero):
- Chain: Arbitrum Sepolia (421614), RPC alias `arbitrum-sepolia`
- Aave `PoolAddressesProvider`: `0xB25a5D144626a0D488e52AE717A051a2E9997076`
- Aave-listed testnet USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- Sourcify supports 421614.

- [ ] **Step 1 (USER):** testnet ETH on the deployer (`make deployer` prints the address; bridge Sepolia ETH via bridge.arbitrum.io, or an Alchemy/QuickNode Arbitrum Sepolia faucet); `KEYSTORE_ACCOUNT` set in `.env` (done: `daveKey`).
- [ ] **Step 2 (USER, interactive password):** `make deploy-testnet` — the deployer/admin is the broadcast wallet (`vm.readCallers()` post-`startBroadcast`, anvil-rehearsed incl. `hasRole` proof). `RESUME=1` re-runs after a partial broadcast.

- [ ] **Step 3: Smoke** — same casts as Task 4 Step 4 against the printed addresses on `--rpc-url arbitrum-sepolia`; write `deployments/421614.json` (same shape as 42161); run `make status` pointed at it (temporarily: `jq` path override or copy) to close Task 8's deferred live check.
- [ ] **Step 4: Commit** broadcast evidence: `chore: testnet dress rehearsal — Arbitrum Sepolia deploy + Sourcify verification`.

---

### Task 4: Mainnet deploy to Arbitrum One  ⚠️ USER GATE

**Files:**
- Create: `deployments/42161.json`, `README.md` (addresses section)

**Interfaces:**
- Consumes: `DeployEveryield.run(admin)`.
- Produces: live `VAULT` / `MANAGER` / `ADAPTER` addresses consumed by Task 6's `app/lib/addresses.ts` and Task 8's Makefile.

- [ ] **Step 1 (USER):** deployer (`make deployer` prints it) needs ~$3–5 ETH on Arbitrum One; `.env` has `ARBITRUM_RPC_URL` + `KEYSTORE_ACCOUNT` (no verifier API key — Sourcify).
- [ ] **Step 2: Broadcast + verify (USER, interactive password):** `make deploy-mainnet` — admin = broadcast wallet; all facet + diamond contracts get Sourcify matches (links: `https://repo.sourcify.dev/contracts/full_match/42161/<address>/`). If verification lags or the broadcast is partial: `make deploy-mainnet RESUME=1`. (Broadcast path pre-proven twice: anvil fork rehearsal + Arbitrum Sepolia dress rehearsal.)
- [ ] **Step 4: Smoke-check the wiring on-chain**:

```bash
cast call <VAULT> "strategyManager()(address)" --rpc-url arbitrum     # == MANAGER
cast call <VAULT> "asset()(address)" --rpc-url arbitrum                # == 0xaf88...5831
cast call <ADAPTER> "operator()(address)" --rpc-url arbitrum           # == MANAGER
cast call <VAULT> "name()(string)" --rpc-url arbitrum                  # "Everyield USDC Vault"
```

- [ ] **Step 5: Record**: write `deployments/42161.json` `{"vault": "0x…", "manager": "0x…", "adapter": "0x…", "usdc": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "block": <deploy block>}`; add a "Deployed contracts (Arbitrum One)" table with Arbiscan links to `README.md`.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: deploy Everyield stack to Arbitrum One (verified)"` — include `broadcast/**/run-latest.json`.

---

### Task 5: Frontend bootstrap from the Particle scaffold  ⚠️ USER GATE (keys)

**Files:**
- Create: `app/` (Next.js project — scaffold copy, bun-ified)

**Interfaces:**
- Produces: booting app with Privy login + UA init (`useEIP7702: true`) + unified balance render; `lib/eip7702.ts` kept verbatim. Tasks 6–7 build inside it.

- [ ] **Step 1 (USER):** create the two dashboards' credentials — Particle (dashboard.particle.network → new project → Web app → copy projectId/clientKey/appId) and Privy (dashboard.privy.io → new app → enable email+Google login and embedded wallets "create on login: all users" → copy App ID + Client ID).
- [ ] **Step 2: Copy scaffold** (already cloned in the session scratchpad; if gone, re-clone: `git clone --depth 1 https://github.com/Particle-Network/universal-accounts-7702 app`): `cp -R <scratchpad>/ua7702/. app/ && rm -rf app/.git app/yarn.lock` then in `app/package.json`: bump `"@particle-network/universal-account-sdk": "^2.0.3"`, remove `"@lifi/sdk"`.
- [ ] **Step 3: Strip LI.FI + swap/sell surface**: delete `app/hooks/useLiFiBalances.ts`, `app/hooks/useLiFiTokens.ts`, `app/lib/lifi*.ts`, `app/lib/buy-transaction.ts`, `app/lib/sell-transaction.ts`, `app/lib/pay-with.ts`, `app/components/SwapCard.tsx`, `app/components/SellTokenDialog.tsx`, `app/components/SelectionPanel.tsx`; remove their imports/usages from `app/page.tsx` (the UA init effect, balance fetch via `getPrimaryAssets`, `getTransactions`, and `TransferCard` remain).
- [ ] **Step 4: `app/.env.local`** (values from Step 1; also commit an `app/.env.example` with empty values):

```bash
NEXT_PUBLIC_PROJECT_ID=""
NEXT_PUBLIC_CLIENT_KEY=""
NEXT_PUBLIC_APP_ID=""
NEXT_PUBLIC_PRIVY_APP_ID=""
NEXT_PUBLIC_PRIVY_CLIENT_ID=""
```

- [ ] **Step 5: Boot**: `cd app && bun install && bun dev` → login with email → embedded wallet created → UA initializes → unified balance shows $0.00. If the SDK `^2.0.3` bump breaks a type/import at this stage, pin back to `^1.0.24` (scaffold-verified) and note it in README.
- [ ] **Step 6: Commit** `git add app && git commit -m "feat: app scaffold — Privy 7702 login + UA unified balance (bun)"`.

---

### Task 6: `app/lib/everyield.ts` — deposit/withdraw builders + reads

**Files:**
- Create: `app/lib/addresses.ts`, `app/lib/everyield.ts`, `app/lib/everyield.test.ts`

**Interfaces:**
- Consumes: Task 4 addresses; UA SDK (`createUniversalTransaction`, `CHAIN_ID.ARBITRUM_MAINNET_ONE`, `SUPPORTED_TOKEN_TYPE.USDC`); ethers v6.
- Produces (Task 7 imports these exact names): `createDepositTx(ua, amountUsdc, owner)`, `createWithdrawTx(ua, shares, owner)`, `readPosition(owner) → {shares, usdcValue, idleAssets}`, `readApy() → number`.

- [ ] **Step 1: Write `app/lib/addresses.ts`** (values from `deployments/42161.json`):

```ts
export const VAULT = "0x_FROM_DEPLOYMENTS_42161" as const;
export const MANAGER = "0x_FROM_DEPLOYMENTS_42161" as const;
export const ADAPTER = "0x_FROM_DEPLOYMENTS_42161" as const;
export const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;
export const AAVE_POOL_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb" as const;
export const ARBITRUM_RPC = "https://arb1.arbitrum.io/rpc" as const;
```

- [ ] **Step 2: Write `app/lib/everyield.ts`**:

```ts
import { Contract, Interface, JsonRpcProvider, formatUnits, parseUnits } from "ethers";
import { CHAIN_ID, SUPPORTED_TOKEN_TYPE, type UniversalAccount } from "@particle-network/universal-account-sdk";
import { AAVE_POOL_PROVIDER, ARBITRUM_RPC, ARBITRUM_USDC, VAULT } from "./addresses";

const erc20 = new Interface(["function approve(address spender, uint256 value) returns (bool)"]);
export const vaultAbi = new Interface([
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function idleAssets() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
]);
// PRICING RULE (fork-test finding, reviewer-confirmed): NEVER price positions via
// convertToAssets/previewRedeem — those selectors bind library-internally to idle-only
// totalAssets. Only the external totalAssets() reports full NAV. Position value is
// shares * totalAssets() / totalSupply().
const providerAbi = new Interface(["function getPool() view returns (address)"]);
const poolAbi = new Interface([
  "function getReserveData(address) view returns ((uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))",
]);

const rpc = new JsonRpcProvider(ARBITRUM_RPC);

export function encodeDeposit(amountUsdc: string, owner: string) {
  const amount6 = parseUnits(amountUsdc, 6);
  return [
    { to: ARBITRUM_USDC, data: erc20.encodeFunctionData("approve", [VAULT, amount6]) },
    { to: VAULT, data: vaultAbi.encodeFunctionData("deposit", [amount6, owner]) },
  ];
}

export async function createDepositTx(ua: UniversalAccount, amountUsdc: string, owner: string) {
  return ua.createUniversalTransaction({
    chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
    expectTokens: [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount: amountUsdc }],
    transactions: encodeDeposit(amountUsdc, owner),
  });
}

export async function createWithdrawTx(ua: UniversalAccount, shares: bigint, owner: string) {
  return ua.createUniversalTransaction({
    chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
    // No inbound asset needed to redeem; gas comes from the unified balance (universalGas).
    // If the SDK rejects an empty array at runtime, use the docs' dust pattern:
    // [{ type: SUPPORTED_TOKEN_TYPE.ETH, amount: "0.0000001" }]
    expectTokens: [],
    transactions: [{ to: VAULT, data: vaultAbi.encodeFunctionData("redeem", [shares, owner, owner]) }],
  });
}

export async function readPosition(owner: string) {
  const vault = new Contract(VAULT, vaultAbi, rpc);
  const [shares, idleAssets, totalAssets, totalSupply] = await Promise.all([
    vault.balanceOf(owner),
    vault.idleAssets(),
    vault.totalAssets(),
    vault.totalSupply(),
  ]);
  // Full-NAV pricing (see PRICING RULE above); fullyIdle gates deposit/withdraw availability.
  const usdcValue: bigint = totalSupply === 0n ? 0n : (shares * totalAssets) / totalSupply;
  const fullyIdle = idleAssets >= totalAssets;
  return { shares, usdcValue, idleAssets, fullyIdle, display: formatUnits(usdcValue, 6) };
}

export async function readApy(): Promise<number> {
  const provider = new Contract(AAVE_POOL_PROVIDER, providerAbi, rpc);
  const pool = new Contract(await provider.getPool(), poolAbi, rpc);
  const data = await pool.getReserveData(ARBITRUM_USDC);
  const liquidityRateRay: bigint = data[2]; // currentLiquidityRate (ray, 1e27)
  const apr = Number(liquidityRateRay) / 1e27;
  return (Math.exp(apr) - 1) * 100; // continuous-compounding APY, in %
}
```
NOTE for implementer: verify `getReserveData` tuple index `[2]` = `currentLiquidityRate` against the Aave V3 `DataTypes.ReserveDataLegacy` layout at build time with one `cast call` — if the struct decode is finicky, swap to `cast`-checked raw slot or use the simpler `IPool.getReserveNormalizedIncome` display path. Static import `Contract` at top instead of the dynamic-import dance if bundling allows.

- [ ] **Step 3: Write `app/lib/everyield.test.ts`** (bun test — the one runnable check for the money-path encoding):

```ts
import { describe, expect, it } from "bun:test";
import { Interface, parseUnits } from "ethers";
import { encodeDeposit } from "./everyield";
import { ARBITRUM_USDC, VAULT } from "./addresses";

describe("encodeDeposit", () => {
  it("batches approve(vault, amt) then deposit(amt, owner)", () => {
    const owner = "0x000000000000000000000000000000000000dEaD";
    const [approve, deposit] = encodeDeposit("12.5", owner);
    expect(approve.to).toBe(ARBITRUM_USDC);
    expect(deposit.to).toBe(VAULT);
    const dec = new Interface(["function deposit(uint256,address)"]).decodeFunctionData(
      "deposit",
      deposit.data,
    );
    expect(dec[0]).toBe(parseUnits("12.5", 6));
    expect(dec[1].toLowerCase()).toBe(owner.toLowerCase());
  });
});
```

- [ ] **Step 4: Run** `cd app && bun test` → PASS.
- [ ] **Step 5: Commit** `git add app && git commit -m "feat: universal deposit/withdraw builders + on-chain reads"`.

---

### Task 7: Screens — Home, Activity, rebrand

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- Create: `app/components/SaveCard.tsx`, `app/components/PositionCard.tsx`, `app/components/ActivityFeed.tsx`, `app/components/ChainBreakdown.tsx`
- Delete: `app/components/TransferCard.tsx` (its UA flow moves into SaveCard), scaffold branding (`LandingHero.tsx` content rewritten)

**Interfaces:**
- Consumes: Task 6 exports; scaffold's `handleEIP7702Authorizations`, `signMessage`, `useSign7702Authorization`, `universalAccount.getPrimaryAssets()/getTransactions()`, `transaction.feeQuotes[0].fees.totals` (fields `feeTokenAmountInUSD`, `gasFeeTokenAmountInUSD`).

Run the **frontend-design skill before writing UI code** in this task; design for both themes; no chain names in the primary flow.

- [ ] **Step 1: SaveCard (the one button).** Amount input → on change, debounce-call `createDepositTx` and render the fee preview from `tx.feeQuotes[0].fees.totals.feeTokenAmountInUSD` ("Total cost incl. routing + gas: $X.XX — nothing hidden"). Confirm → reuse the scaffold's exact 4-step send (from `TransferCard.tsx:84-138`): `createDepositTx` → `handleEIP7702Authorizations(transaction.userOps, signAuthorization, walletAddress)` → `signMessage({ message: transaction.rootHash }, { address: walletAddress })` → `universalAccount.sendTransaction(transaction, signature, authorizations)`. On success push `{id: sendResult.transactionId, kind: "save", amount}` into activity state.
- [ ] **Step 2: PositionCard.** Poll `readPosition(owner)` + `readApy()` every 15s: big USDC value (full-NAV pricing from `readPosition` — never `convertToAssets`), shares subtitle, live APY badge, "Withdraw" secondary action → same 4-step send with `createWithdrawTx`.
- [ ] **Step 2b: Interaction-window guard (fork-test finding).** Save and Withdraw are enabled ONLY when `readPosition(...).fullyIdle` is true — while funds are deployed to Aave, the vault's ERC-4626 share math misprices against idle-only assets, so user transactions must never execute mid-deployment. When not fully idle, both actions show a calm "Optimizing yield — back in a moment" state with a copyable `make exit` hint (demo-operator recalls, UI re-enables automatically on next poll). Cranks (`make crank`) run between user interactions, never during them.
- [ ] **Step 3: Home composition.** One unified-balance hero number from `getPrimaryAssets().totalAmountInUSD`; `ChainBreakdown` = collapsible "where your money physically lives" listing per-chain `chainAggregation` rows (this is the ONLY place chain names appear); then PositionCard + SaveCard.
- [ ] **Step 4: ActivityFeed.** `getTransactions(1, 15)` + local optimistic entries; each in-flight tx renders staged progress (stages + timings calibrated in Task 9): Signed → Routing funds → Executing on destination → Confirmed, with a `https://universalx.app/activity/details?id=<transactionId>` link.
- [ ] **Step 5: Rebrand.** Title/metadata "Everyield — the savings account that doesn't know what a chain is"; strip scaffold demo copy, purple gradient, trustwallet/berachain logo URLs, Next.js svgs; keep `login({ loginMethods: ["email", "google"] })`; landing = one sentence + one Login button.
- [ ] **Step 6: Check** `bun run build` → clean production build, then click through login → preview → (do NOT send — that's Task 9).
- [ ] **Step 7: Commit** `git add app && git commit -m "feat: Everyield screens — save flow, position, activity, rebrand"`.

---

### Task 8: Keeper Makefile

**Files:**
- Create: `Makefile` (repo root)

**Interfaces:**
- Consumes: Task 4 addresses (read from `deployments/42161.json` via `jq`), keystore account.
- Produces: `make crank`, `make exit`, `make status` used in Task 9/demo.

- [ ] **Step 1: Write `Makefile`**:

```makefile
-include .env
VAULT   := $(shell jq -r .vault deployments/42161.json)
MANAGER := $(shell jq -r .manager deployments/42161.json)
ADAPTER := $(shell jq -r .adapter deployments/42161.json)
RPC     := --rpc-url $(ARBITRUM_RPC_URL)
ACCT    := --account $(KEYSTORE_ACCOUNT)

crank: ## rebalance to 80/20 then supply adapter idle into Aave
	cast send $(MANAGER) "rebalance()" $(RPC) $(ACCT)
	cast send $(MANAGER) "crankDeploy(address)" $(ADAPTER) $(RPC) $(ACCT)

exit: ## recall everything from Aave to the vault (pre-full-withdraw)
	cast send $(MANAGER) "updateStrategyTarget(address,uint16)" $(ADAPTER) 0 $(RPC) $(ACCT)
	cast send $(MANAGER) "rebalance()" $(RPC) $(ACCT)
	cast send $(MANAGER) "updateStrategyTarget(address,uint16)" $(ADAPTER) 8000 $(RPC) $(ACCT)

status:
	@echo "totalAssets:"; cast call $(VAULT) "totalAssets()(uint256)" $(RPC)
	@echo "idleAssets:";  cast call $(VAULT) "idleAssets()(uint256)" $(RPC)
	@echo "inAave:";      cast call $(ADAPTER) "totalAssetsManaged()(uint256)" $(RPC)
```
(`KEYSTORE_ACCOUNT=<name>` goes into `.env`/`.env.example`. `updateStrategyTarget` exists as `updateStrategyTarget(address strategy, uint16 newBps)`, admin-gated — the exit sequence matches the fork test's proven full-exit path.)

- [ ] **Step 2: Check** `make status` returns three numbers (zeros pre-demo).
- [ ] **Step 3: Commit** `git add Makefile .env.example && git commit -m "feat: keeper targets — crank, exit, status"`.

---

### Task 9: Dust rehearsal end-to-end  ⚠️ USER GATE (real funds)

**Files:**
- Modify: `app/components/ActivityFeed.tsx` (stage timings), `README.md` (measured latency)

- [ ] **Step 1 (USER):** fund the demo: log into the app with the demo email → copy the embedded-wallet EOA → send it ~$15 USDC **on Base** + confirm deployer still has Arbitrum ETH for cranks.
- [ ] **Step 2: Dust deposit** ($2 first): full app flow. Record: wall-clock from `sendTransaction` to shares minted (poll `readPosition`), the `feeQuotes` USD total vs. actual, the universalx activity link. Verify on Arbiscan: vault's `Deposit` event, `eyUSDC` balance on the EOA.
- [ ] **Step 3: Crank** `make crank` → `make status` shows ~80/20 split; Arbiscan: adapter holds aUSDC.
- [ ] **Step 4: Withdraw** a dust amount via the app (inside idle buffer) → USDC lands back in the unified balance. Then `make exit` + full withdraw → position zero.
- [ ] **Step 5: Tune** ActivityFeed stage durations to the measured latency; write the measured numbers (deposit latency, fee %) into README's demo section. If latency > ~2 min, add copy to the waiting state ("your money is crossing chains — Particle is routing it").
- [ ] **Step 6: Repeat** the whole loop once more ($10) as the real rehearsal at video amounts.
- [ ] **Step 7: Commit** `git add -A && git commit -m "docs: measured live E2E — latency, fees, rehearsal notes"`.

---

### Task 10: Ship — polish, Vercel, evidence, video, submission

**Files:**
- Modify: `README.md`; Create: `docs/DEMO.md` (video script), `app/vercel.json` if needed

- [ ] **Step 1: Polish pass** — run the frontend-design/web-design-guidelines skills against the app; fix loading/empty/error states, mobile layout, dark mode.
- [ ] **Step 2: Deploy** to Vercel (bun build): `cd app && vercel --prod` with the five env vars set in the Vercel dashboard. Click through login on the production URL.
- [ ] **Step 3: README as the judge's landing page**: one-liner, architecture diagram (three diamonds + UA leg), deployed addresses table (Arbiscan links), "built during UXMAXX on the Lattice framework — `forge install dadadave80/lattice`" attribution, measured demo numbers, budget honesty ($X.XX total spent).
- [ ] **Step 4: Video (2–3 min)** per `docs/DEMO.md` script: (1) problem — 10s of bridge-UI pain; (2) login with email, balance appears — "we never asked what chain"; (3) Save $10 with the fee preview → staged progress → position + live APY; (4) Arbiscan proof — real Aave position held by a diamond; (5) withdraw → money back; (6) 15s architecture slide (7702 EOA → UA routing → three Lattice diamonds).
- [ ] **Step 5: Submit** on the Encode platform before the finale: repo link, live URL, video, track = Universal Accounts. Paste the submission text (write it from the README one-liner + requirement checklist: 7702 mode ✓, cross-chain value via UA ✓, functional demo ✓).
- [ ] **Step 6: Final commit + tag** `git tag uxmaxx-submission && git push --tags` (after creating the GitHub repo and pushing `main`).

---

## Schedule mapping

| Day | Tasks |
|---|---|
| Fri 18 (tonight) | 1, 2, start 3; USER: dashboard keys (Task 5 Step 1) |
| Sat 19 | finish 3, 4 (deploy), 5, start 6 |
| Sun 20 | 6, 7, 8, dust deposit (9 Steps 1–3) |
| Mon 21 | 9 complete (rehearsals), start 10 (polish + Vercel) |
| Tue 22 | 10 — video + submission by early afternoon; finale 16:00 GMT+1 |
