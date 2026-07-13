// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HoodInstantFactory} from "../src/HoodInstantFactory.sol";

contract DeployInstant is Script {
    address constant RH_UNI_V2_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address protocol = vm.envOr("PROTOCOL", vm.addr(pk));
        address router = vm.envOr("UNI_ROUTER", RH_UNI_V2_ROUTER);
        uint256 createFee = vm.envOr("CREATE_FEE_WEI", uint256(0.0005 ether));
        uint256 minLp = vm.envOr("MIN_LP_ETH_WEI", uint256(0.01 ether));

        vm.startBroadcast(pk);
        HoodInstantFactory factory =
            new HoodInstantFactory(protocol, router, createFee, minLp);
        vm.stopBroadcast();

        console2.log("HoodInstantFactory:", address(factory));
        console2.log("protocol:", protocol);
        console2.log("router:", router);
        console2.log("createFee wei:", createFee);
        console2.log("minLpEth wei:", minLp);
    }
}
