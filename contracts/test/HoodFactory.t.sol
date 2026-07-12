// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HoodFactory} from "../src/HoodFactory.sol";
import {BondingMarket, FeeConfig} from "../src/BondingMarket.sol";
import {HoodToken} from "../src/HoodToken.sol";

/// @dev Minimal Uniswap V2 router mock for graduation tests
contract MockRouter {
    address public immutable WETH_ADDR;
    address public immutable factoryAddr;
    address public pair;

    constructor(address weth_, address factory_) {
        WETH_ADDR = weth_;
        factoryAddr = factory_;
        pair = address(new MockPair());
    }

    function factory() external view returns (address) {
        return factoryAddr;
    }

    function WETH() external view returns (address) {
        return WETH_ADDR;
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256, uint256, uint256) {
        // pull tokens
        (bool ok,) = token.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)", msg.sender, pair, amountTokenDesired
            )
        );
        require(ok, "pull");
        // mint fake LP to `to`
        MockPair(pair).mint(to, 1 ether);
        return (amountTokenDesired, msg.value, 1 ether);
    }
}

contract MockFactory {
    address public pair;

    function setPair(address p) external {
        pair = p;
    }

    function getPair(address, address) external view returns (address) {
        return pair;
    }
}

contract MockPair {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
}

contract MockWETH {}

contract HoodFactoryTest is Test {
    HoodFactory factory;
    MockRouter router;
    MockFactory uniFactory;
    address protocol = address(0xBEEF);
    address alice = address(0xA11CE);

    function setUp() public {
        uniFactory = new MockFactory();
        MockWETH weth = new MockWETH();
        router = new MockRouter(address(weth), address(uniFactory));
        uniFactory.setPair(router.pair());

        factory = new HoodFactory(protocol, address(router), 0.001 ether, 0.05 ether);
        vm.deal(alice, 100 ether);
    }

    function _fees() internal pure returns (FeeConfig memory) {
        return FeeConfig({
            buyFeeBps: 100,
            sellFeeBps: 100,
            feeCreatorBps: 7000,
            feeProtocolBps: 2000,
            feeBuybackBurnBps: 1000,
            tokenBurnOnBuyBps: 100
        });
    }

    function test_fixed_supply_1b() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        (address market, address token) =
            factory.createToken{value: 0.001 ether}("Fixed", "FIX", _fees(), supply, 0);
        assertEq(HoodToken(token).totalSupply(), supply);
        assertEq(HoodToken(token).maxSupply(), supply);
        assertEq(HoodToken(token).balanceOf(market), supply);
    }

    function test_invalid_supply_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.createToken{value: 0.001 ether}("X", "X", _fees(), 123 ether, 0);
    }

    function test_buy_from_inventory() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        (address marketAddr, address token) =
            factory.createToken{value: 0.001 ether}("T", "T", _fees(), supply, 0);
        BondingMarket market = BondingMarket(payable(marketAddr));

        address bob = address(0xB0B);
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        market.buy{value: 0.02 ether}(bob, 0);

        assertGt(HoodToken(token).balanceOf(bob), 0);
        assertLt(HoodToken(token).balanceOf(address(market)), supply);
        assertLe(HoodToken(token).totalSupply(), supply);
    }

    function test_sell_returns_inventory() public {
        uint256 supply = factory.SUPPLY_1B();
        // keep under graduate threshold (0.05)
        vm.prank(alice);
        (address marketAddr, address token) =
            factory.createToken{value: 0.021 ether}("S", "S", _fees(), supply, 0);
        BondingMarket market = BondingMarket(payable(marketAddr));
        assertFalse(market.graduated());
        uint256 bal = HoodToken(token).balanceOf(alice);
        assertGt(bal, 0);

        vm.startPrank(alice);
        HoodToken(token).approve(address(market), bal);
        market.sell(bal / 2, 0);
        vm.stopPrank();
    }

    function test_graduate_when_threshold() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        (address marketAddr,) =
            factory.createToken{value: 0.001 ether}("G", "G", _fees(), supply, 0);
        BondingMarket market = BondingMarket(payable(marketAddr));

        address bob = address(0xB0B);
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        market.buy{value: 0.1 ether}(bob, 0);

        assertTrue(market.graduated());
        assertTrue(market.uniswapPair() != address(0));

        vm.prank(bob);
        vm.expectRevert();
        market.buy{value: 0.01 ether}(bob, 0);
    }
}
