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
    uint256 constant FORK_BLOCK = 485_218_100;

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
        assertEq(IStrategyManager(manager).vault(), vault, "manager knows its vault");
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

        // 5. full exit (canonical): a plain rebalance() only recalls the ABOVE-target excess, leaving
        //    ~80% in Aave. And ERC4626Lib prices redeem against IDLE assets only — the VaultCore
        //    totalAssets() override does not virtualize into the library's share math (verified on-fork:
        //    the step-4 partial paid 10% of idle, not 10% of NAV) — so a full redeem must first pull ALL
        //    strategy funds back to idle. Force the target to 0, then rebalance recalls everything.
        IStrategyManager(manager).updateStrategyTarget(adapter, 0);
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
