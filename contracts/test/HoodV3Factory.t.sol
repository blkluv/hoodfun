// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HoodV3Token} from "../src/v3/HoodV3Token.sol";
import {HoodV3Locker} from "../src/v3/HoodV3Locker.sol";
import {HoodV3Factory} from "../src/v3/HoodV3Factory.sol";
import {
    IUniswapV3FactoryMinimal,
    IUniswapV3PoolMinimal,
    INonfungiblePositionManagerMinimal,
    ISwapRouter02Minimal,
    IWETH9Minimal
} from "../src/v3/interfaces/IUniswapV3.sol";
import {TickMath} from "../src/v3/lib/TickMath.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MockWETH is ERC20, IWETH9Minimal {
    constructor() ERC20("WETH", "WETH") {}

    function deposit() external payable override {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external override {
        _burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "eth");
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}

/// @dev Minimal V3 factory: one pool per (t0,t1,fee)
contract MockV3Factory is IUniswapV3FactoryMinimal {
    mapping(bytes32 => address) public pools;
    mapping(uint24 => int24) public spacing;

    constructor() {
        spacing[10_000] = 200;
    }

    function feeAmountTickSpacing(uint24 fee) external view returns (int24) {
        return spacing[fee];
    }

    function getPool(address a, address b, uint24 fee) external view returns (address) {
        return pools[_key(a, b, fee)];
    }

    function setPool(address a, address b, uint24 fee, address pool) external {
        pools[_key(a, b, fee)] = pool;
    }

    function _key(address a, address b, uint24 fee) internal pure returns (bytes32) {
        (address t0, address t1) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encode(t0, t1, fee));
    }
}

contract MockV3Pool is IUniswapV3PoolMinimal {
    int24 public tick;

    function setTick(int24 t) external {
        tick = t;
    }

    function slot0()
        external
        view
        returns (uint160, int24, uint16, uint16, uint16, uint8, bool)
    {
        return (0, tick, 0, 0, 0, 0, true);
    }
}

contract MockNPM is INonfungiblePositionManagerMinimal, IERC721Receiver {
    MockV3Factory public factory;
    uint256 public nextId = 1;
    address public lastRecipient;
    mapping(uint256 => address) public owners;

    constructor(MockV3Factory f) {
        factory = f;
    }

    function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external payable returns (address pool) {
        pool = factory.getPool(token0, token1, fee);
        if (pool == address(0)) {
            MockV3Pool p = new MockV3Pool();
            p.setTick(TickMath.getTickAtSqrtPrice(sqrtPriceX96));
            pool = address(p);
            factory.setPool(token0, token1, fee, pool);
        }
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        if (params.amount0Desired > 0) {
            ERC20(params.token0).transferFrom(msg.sender, address(this), params.amount0Desired);
            amount0 = params.amount0Desired;
        }
        if (params.amount1Desired > 0) {
            ERC20(params.token1).transferFrom(msg.sender, address(this), params.amount1Desired);
            amount1 = params.amount1Desired;
        }

        tokenId = nextId++;
        owners[tokenId] = params.recipient;
        lastRecipient = params.recipient;
        liquidity = 1e18;
        HoodV3Locker(payable(params.recipient)).onERC721Received(msg.sender, msg.sender, tokenId, "");
    }

    function collect(CollectParams calldata) external payable returns (uint256, uint256) {
        return (0, 0);
    }

    function positions(uint256)
        external
        pure
        returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128)
    {
        return (0, address(0), address(0), address(0), 0, 0, 0, 0, 0, 0, 0, 0);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract MockSwapRouter is ISwapRouter02Minimal {
    address public immutable weth;

    constructor(address weth_) {
        weth = weth_;
    }

    function WETH9() external view returns (address) {
        return weth;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        // Wrap ETH if needed and pretend 1:1 token out from pool inventory is not available —
        // mint is not possible on clone tokens; transfer from this contract if funded.
        // For unit test: return msg.value * 1000 as fake amount without actual transfer if empty.
        amountOut = params.amountIn * 1000;
        // If we hold the token, send it
        uint256 bal = ERC20(params.tokenOut).balanceOf(address(this));
        if (bal > 0) {
            uint256 send = bal < amountOut ? bal : amountOut;
            amountOut = send;
            ERC20(params.tokenOut).transfer(params.recipient, send);
        }
        // swallow ETH
        if (msg.value > 0) {
            IWETH9Minimal(weth).deposit{value: msg.value}();
        }
    }
}

contract HoodV3FactoryTest is Test {
    HoodV3Factory factory;
    HoodV3Locker locker;
    HoodV3Token impl;
    MockWETH weth;
    MockV3Factory v3Factory;
    MockNPM npm;
    MockSwapRouter router;

    address alice = makeAddr("alice");

    receive() external payable {}

    function setUp() public {
        weth = new MockWETH();
        v3Factory = new MockV3Factory();
        npm = new MockNPM(v3Factory);
        router = new MockSwapRouter(address(weth));
        impl = new HoodV3Token();

        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        locker = new HoodV3Locker(
            INonfungiblePositionManagerMinimal(address(npm)), address(this), predicted, 5_000
        );
        factory = new HoodV3Factory(address(impl), address(this), locker, 0.0005 ether);
        require(address(factory) == predicted, "pred");

        factory.addDexConfig(
            HoodV3Factory.DexConfig({
                dexFactory: IUniswapV3FactoryMinimal(address(v3Factory)),
                positionManager: INonfungiblePositionManagerMinimal(address(npm)),
                swapRouter: ISwapRouter02Minimal(address(router)),
                weth9: address(weth),
                fee: 10_000,
                tickSpacing: 200,
                enabled: true,
                name: "uniswap"
            })
        );
        factory.addLaunchConfig(
            HoodV3Factory.LaunchConfig({
                pairToken: address(weth),
                totalSupply: 1_000_000_000 ether,
                initialTick: -204_200,
                maxWalletBps: 200,
                maxTxBps: 0,
                restrictionBlocks: 366,
                enabled: true
            })
        );

        vm.deal(alice, 10 ether);
    }

    function test_launchToken_emitsAndLocks() public {
        bytes32 salt = bytes32(uint256(0xc0de));
        vm.prank(alice);
        (address token, address pool, uint256 positionId) = factory.launchToken{value: 0.0105 ether}(
            HoodV3Factory.TokenParams({
                name: "Test",
                symbol: "TEST",
                metadataURI: "ipfs://x",
                rewardRecipient: address(0)
            }),
            0,
            0,
            salt,
            0
        );

        assertTrue(token != address(0));
        assertTrue(pool != address(0));
        assertTrue(positionId > 0);
        assertEq(factory.pairOfToken(token), pool);
        assertTrue(factory.isHoodToken(token));
        assertEq(locker.positionOf(token), positionId);
        // Creator got initial-buy tokens if router held inventory (may be 0 in mock)
        assertEq(HoodV3Token(token).limitsActivated(), true);
        assertEq(HoodV3Token(token).deployer(), alice);
    }

    function test_predictMatches() public {
        bytes32 salt = bytes32(uint256(1));
        address predicted = factory.predictTokenAddress(alice, salt);
        vm.prank(alice);
        (address token,,) = factory.launchToken{value: 0.0005 ether}(
            HoodV3Factory.TokenParams("A", "A", "", address(0)), 0, 0, salt, 0
        );
        assertEq(token, predicted);
    }

    function test_revertBelowFee() public {
        vm.prank(alice);
        vm.expectRevert(HoodV3Factory.InsufficientLaunchFee.selector);
        factory.launchToken{value: 0.0001 ether}(
            HoodV3Factory.TokenParams("A", "A", "", address(0)), 0, 0, bytes32(0), 0
        );
    }
}
