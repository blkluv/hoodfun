// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HoodFactory} from "../src/HoodFactory.sol";

contract Deploy is Script {
    // Robinhood Chain Uniswap V2 (canonical)
    address constant RH_UNI_V2_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address protocol = vm.envOr("PROTOCOL", vm.addr(pk));
        address router = vm.envOr("UNI_ROUTER", RH_UNI_V2_ROUTER);
        uint256 createFee = vm.envOr("CREATE_FEE_WEI", uint256(0.0005 ether));
        // 0.25 ETH raised → graduate to Uniswap (DexScreener-ready)
        uint256 gradThreshold = vm.envOr("GRADUATE_THRESHOLD_WEI", uint256(0.25 ether));

        vm.startBroadcast(pk);
        HoodFactory factory =
            new HoodFactory(protocol, router, createFee, gradThreshold);
        vm.stopBroadcast();

        console2.log("HoodFactory v2:", address(factory));
        console2.log("protocol:", protocol);
        console2.log("router:", router);
        console2.log("createFee wei:", createFee);
        console2.log("graduateThreshold wei:", gradThreshold);
    }
}
