// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlLib} from "@lattice/access/libraries/AccessControlLib.sol";
import {AaveV3AdapterLib} from "@lattice/defi/libraries/AaveV3AdapterLib.sol";

/// @title EveryieldAaveInit
/// @notice One-shot initializer for the Everyield Aave V3 adapter diamond. Runs the module initializers in
///         dependency order inside the single initializing window opened by {LatticeDiamond.initialize}:
///         AccessControl (grants `DEFAULT_ADMIN_ROLE` to `admin`, gating operator changes), then the Aave V3
///         adapter config (validates the provider/asset and registers IProtocolAdapter + IAaveV3Adapter via
///         ERC-165). The transient ReentrancyGuard is init-free as of lattice v0.2.0 (Solady logic, mixin
///         modifiers over transient storage), so it is deliberately NOT seeded here.
contract EveryieldAaveInit {
    function init(address admin_, address provider_, address asset_, address vault_, address rewardRecipient_)
        external
    {
        AccessControlLib.__AccessControl_init(admin_);
        AaveV3AdapterLib.__AaveV3Adapter_init(provider_, asset_, vault_, rewardRecipient_, bytes32(0), 1e18);
    }
}
