// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {FacetCut} from "@diamond/libraries/DiamondLib.sol";
import {LatticeDiamond} from "@lattice/LatticeDiamond.sol";
import {IStrategyManager} from "@lattice/interfaces/defi/IStrategyManager.sol";
import {IVaultCore} from "@lattice/interfaces/defi/IVaultCore.sol";
import {Test} from "forge-std/Test.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
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
        LatticeDiamond diamond = new LatticeDiamond();
        diamond.initialize(cuts, init, cd);
        return address(diamond);
    }
}
