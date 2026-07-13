// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HoodInstantFactory} from "../src/HoodInstantFactory.sol";
import {HoodToken} from "../src/HoodToken.sol";

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

contract MockUniFactory {
    address public pair;

    constructor() {
        pair = address(new MockPair());
    }

    function getPair(address, address) external view returns (address) {
        return pair;
    }
}

contract MockRouter {
    address public immutable WETH_ADDR;
    address public immutable factoryAddr;
    address public pair;

    constructor(address weth_, address factory_) {
        WETH_ADDR = weth_;
        factoryAddr = factory_;
        pair = MockUniFactory(factory_).pair();
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
        (bool ok,) = token.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                pair,
                amountTokenDesired
            )
        );
        require(ok, "pull");
        MockPair(pair).mint(to, 1 ether);
        return (amountTokenDesired, msg.value, 1 ether);
    }
}

contract MockWETH {}

contract HoodInstantFactoryTest is Test {
    HoodInstantFactory factory;
    MockRouter router;
    MockUniFactory uniFactory;
    address protocol = address(0xBEEF);
    address alice = address(0xA11CE);
    address constant DEAD = 0x000000000000000000000000000000000000dEaD;

    function setUp() public {
        uniFactory = new MockUniFactory();
        router = new MockRouter(address(new MockWETH()), address(uniFactory));
        factory = new HoodInstantFactory(
            protocol, address(router), 0.0005 ether, 0.01 ether
        );
        vm.deal(alice, 100 ether);
    }

    function test_zero_creator_all_to_lp() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        (address token, address pair) = factory.createToken{value: 0.0505 ether}(
            "HoodMemes", "HOODMEMES", supply, true, 0
        );

        assertEq(HoodToken(token).balanceOf(alice), 0);
        assertEq(HoodToken(token).balanceOf(pair), supply);
        (,,,,,, uint16 bps) = _launch(token);
        assertEq(bps, 0);
    }

    function test_creator_5_percent() public {
        uint256 supply = factory.SUPPLY_1B();
        uint256 expectCreator = supply * 500 / 10_000;
        uint256 expectLp = supply - expectCreator;

        vm.prank(alice);
        (address token, address pair) = factory.createToken{value: 0.0505 ether}(
            "Alloc", "ALC", supply, false, 500
        );

        assertEq(HoodToken(token).balanceOf(alice), expectCreator);
        assertEq(HoodToken(token).balanceOf(pair), expectLp);
        (,,,,, bool burned, uint16 bps) = _launch(token);
        assertEq(bps, 500);
        assertFalse(burned);
        assertGt(MockPair(pair).balanceOf(alice), 0);
    }

    function test_creator_10_percent_burn_lp() public {
        uint256 supply = factory.SUPPLY_1B();
        uint256 expectCreator = supply / 10;

        vm.prank(alice);
        (address token, address pair) = factory.createToken{value: 0.0505 ether}(
            "Ten", "TEN", supply, true, 1000
        );

        assertEq(HoodToken(token).balanceOf(alice), expectCreator);
        assertEq(HoodToken(token).balanceOf(pair), supply - expectCreator);
        assertGt(MockPair(pair).balanceOf(DEAD), 0);
    }

    function test_rejects_bad_creator_bps() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        vm.expectRevert(HoodInstantFactory.InvalidCreatorBps.selector);
        factory.createToken{value: 0.0505 ether}("X", "X", supply, true, 250);
    }

    function test_rejects_low_lp() public {
        uint256 supply = factory.SUPPLY_1B();
        vm.prank(alice);
        vm.expectRevert(HoodInstantFactory.InsufficientLp.selector);
        factory.createToken{value: 0.001 ether}("X", "X", supply, true, 0);
    }

    function test_rejects_bad_supply() public {
        vm.prank(alice);
        vm.expectRevert(HoodInstantFactory.InvalidSupply.selector);
        factory.createToken{value: 0.05 ether}("X", "X", 123 ether, true, 0);
    }

    function _launch(address token)
        internal
        view
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            bool,
            uint16
        )
    {
        (
            address t,
            address p,
            address c,
            uint256 ts,
            uint256 lp,
            bool burned,
            ,
            uint16 bps
        ) = factory.launches(token);
        return (t, p, c, ts, lp, burned, bps);
    }
}
