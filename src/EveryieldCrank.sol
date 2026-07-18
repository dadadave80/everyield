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
