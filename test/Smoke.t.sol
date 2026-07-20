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
