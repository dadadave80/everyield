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
    address constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // Arbitrum native USDC
    address constant AAVE_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb; // Aave V3 Arbitrum
    uint16 constant TARGET_BPS = 8000; // 80% Aave / 20% idle

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
