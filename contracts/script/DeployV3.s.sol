// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HoodV3Token} from "../src/v3/HoodV3Token.sol";
import {HoodV3Locker} from "../src/v3/HoodV3Locker.sol";
import {HoodV3Factory} from "../src/v3/HoodV3Factory.sol";
import {
    IUniswapV3FactoryMinimal,
    INonfungiblePositionManagerMinimal,
    ISwapRouter02Minimal
} from "../src/v3/interfaces/IUniswapV3.sol";

/// @notice Deploy Hood V3 stack on Robinhood Chain and seed LaunchHood-compatible defaults.
contract DeployV3 is Script {
    // Official Uniswap on Robinhood Chain (4663)
    address constant RH_V3_FACTORY = 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA;
    address constant RH_NPM = 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3;
    address constant RH_SWAP_ROUTER02 = 0xCaf681a66D020601342297493863E78C959E5cb2;
    address constant RH_WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    // LaunchHood-compatible defaults
    uint24 constant FEE_1PCT = 10_000;
    int24 constant TICK_SPACING_200 = 200;
    int24 constant INITIAL_TICK = -204_200; // ~1.37 ETH FDV @ 1B supply
    uint256 constant SUPPLY_1B = 1_000_000_000 ether;
    uint16 constant MAX_WALLET_BPS = 200; // 2%
    uint16 constant MAX_TX_BPS = 0;
    uint32 constant RESTRICTION_BLOCKS = 366;
    uint16 constant CREATOR_FEE_SHARE_BPS = 5_000; // 50%

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("PROTOCOL", deployer);
        uint256 launchFee = vm.envOr("LAUNCH_FEE_WEI", uint256(0.0005 ether));
        uint16 creatorShare = uint16(vm.envOr("CREATOR_SHARE_BPS", uint256(CREATOR_FEE_SHARE_BPS)));

        vm.startBroadcast(pk);

        HoodV3Token tokenImpl = new HoodV3Token();

        // Predict factory address (next create after locker) so locker immutables line up.
        // Order: tokenImpl already deployed → next = locker → next = factory
        uint64 nonce = vm.getNonce(deployer);
        // After tokenImpl, nonce is for locker. Factory is nonce+1 from current getNonce after tokenImpl.
        // Safer: compute via CREATE address for nonce N (locker) and N+1 (factory).
        address predictedFactory = vm.computeCreateAddress(deployer, nonce + 1);

        HoodV3Locker locker = new HoodV3Locker(
            INonfungiblePositionManagerMinimal(RH_NPM),
            treasury,
            predictedFactory,
            creatorShare
        );

        HoodV3Factory factory = new HoodV3Factory(address(tokenImpl), treasury, locker, launchFee);
        require(address(factory) == predictedFactory, "factory address mismatch");

        factory.addDexConfig(
            HoodV3Factory.DexConfig({
                dexFactory: IUniswapV3FactoryMinimal(RH_V3_FACTORY),
                positionManager: INonfungiblePositionManagerMinimal(RH_NPM),
                swapRouter: ISwapRouter02Minimal(RH_SWAP_ROUTER02),
                weth9: RH_WETH,
                fee: FEE_1PCT,
                tickSpacing: TICK_SPACING_200,
                enabled: true,
                name: "uniswap"
            })
        );

        factory.addLaunchConfig(
            HoodV3Factory.LaunchConfig({
                pairToken: RH_WETH,
                totalSupply: SUPPLY_1B,
                initialTick: INITIAL_TICK,
                maxWalletBps: MAX_WALLET_BPS,
                maxTxBps: MAX_TX_BPS,
                restrictionBlocks: RESTRICTION_BLOCKS,
                enabled: true
            })
        );

        vm.stopBroadcast();

        console2.log("HoodV3Token impl:", address(tokenImpl));
        console2.log("HoodV3Locker:", address(locker));
        console2.log("HoodV3Factory:", address(factory));
        console2.log("treasury:", treasury);
        console2.log("launchFee wei:", launchFee);
        console2.log("creatorShareBps:", creatorShare);
        console2.log("dexId 0: uniswap 1%");
        console2.log("configId 0: 1B @ tick -204200, maxWallet 2%");
    }
}
