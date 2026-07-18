// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

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
