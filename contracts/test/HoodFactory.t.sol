// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HoodFactory} from "../src/HoodFactory.sol";
import {BondingMarket, FeeConfig} from "../src/BondingMarket.sol";
import {HoodToken} from "../src/HoodToken.sol";

contract HoodFactoryTest is Test {
    HoodFactory factory;
    address protocol = address(0xBEEF);
    address alice = address(0xA11CE);

    function setUp() public {
        factory = new HoodFactory(protocol, 0.001 ether);
        vm.deal(alice, 100 ether);
    }

    function _balancedFees() internal pure returns (FeeConfig memory) {
        return FeeConfig({
            buyFeeBps: 100, // 1%
            sellFeeBps: 100,
            feeCreatorBps: 7000, // 70% of fee
            feeProtocolBps: 2000, // 20%
            feeBuybackBurnBps: 1000, // 10% buyback-burn
            tokenBurnOnBuyBps: 100 // 1% of tokens burned on buy
        });
    }

    function test_create_with_creator_buy() public {
        vm.prank(alice);
        (address market, address token) = factory.createToken{value: 0.101 ether}(
            "Cash Cat", "CAT", _balancedFees(), 0
        );
        // 0.001 create fee + 0.1 eth buy
        assertTrue(market != address(0));
        assertTrue(token != address(0));
        assertGt(HoodToken(token).balanceOf(alice), 0);
    }

    function test_buy_and_sell() public {
        vm.prank(alice);
        (address marketAddr,) = factory.createToken{value: 0.001 ether}(
            "Test", "TST", _balancedFees(), 0
        );
        BondingMarket market = BondingMarket(payable(marketAddr));
        HoodToken token = market.token();

        address bob = address(0xB0B);
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        market.buy{value: 0.05 ether}(bob, 0);
        uint256 bal = token.balanceOf(bob);
        assertGt(bal, 0);

        vm.prank(bob);
        token.approve(address(market), bal); // burnFrom doesn't need approve - market calls burnFrom as market
        // burnFrom is onlyMarket - sell calls token.burnFrom which is onlyMarket - good no approve needed

        vm.prank(bob);
        uint256 ethBefore = bob.balance;
        market.sell(bal / 2, 0);
        assertGt(bob.balance, ethBefore);
    }

    function test_holder_burn() public {
        vm.prank(alice);
        (address marketAddr,) = factory.createToken{value: 0.051 ether}(
            "BurnMe", "BRN", _balancedFees(), 0
        );
        BondingMarket market = BondingMarket(payable(marketAddr));
        HoodToken token = market.token();
        uint256 bal = token.balanceOf(alice);
        assertGt(bal, 0);
        vm.prank(alice);
        token.burn(bal / 2);
        assertEq(token.balanceOf(alice), bal - bal / 2);
    }

    function test_invalid_fee_split_reverts() public {
        FeeConfig memory bad = _balancedFees();
        bad.feeCreatorBps = 5000;
        bad.feeProtocolBps = 5000;
        bad.feeBuybackBurnBps = 1000; // sums 11000
        vm.prank(alice);
        vm.expectRevert();
        factory.createToken{value: 0.001 ether}("X", "X", bad, 0);
    }
}
