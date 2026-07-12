// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HoodFactory} from "../src/HoodFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address protocol = vm.envOr("PROTOCOL", vm.addr(pk));
        uint256 createFee = vm.envOr("CREATE_FEE_WEI", uint256(0.0005 ether));

        vm.startBroadcast(pk);
        HoodFactory factory = new HoodFactory(protocol, createFee);
        vm.stopBroadcast();

        console2.log("HoodFactory:", address(factory));
        console2.log("protocol:", protocol);
        console2.log("createFee wei:", createFee);
    }
}
