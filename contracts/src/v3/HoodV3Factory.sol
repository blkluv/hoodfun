// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {TickMath} from "./lib/TickMath.sol";
import {HoodV3Token} from "./HoodV3Token.sol";
import {HoodV3Locker} from "./HoodV3Locker.sol";
import {
    IUniswapV3FactoryMinimal,
    IUniswapV3PoolMinimal,
    INonfungiblePositionManagerMinimal,
    ISwapRouter02Minimal
} from "./interfaces/IUniswapV3.sol";

/// @title HoodV3Factory
/// @notice Instant Uniswap V3 memecoin launches on Robinhood Chain.
///         One tx: clone token → create/init V3 pool → single-sided full-supply
///         LP to permanent locker → optional creator initial buy → anti-snipe on.
///
///         Compatible with RH Uniswap V3:
///           factory 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA
///           NPM     0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3
///           router  0xCaf681a66D020601342297493863E78C959E5cb2
///           WETH    0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73
contract HoodV3Factory is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    address public immutable TOKEN_IMPL;
    address public immutable PROTOCOL_TREASURY;
    HoodV3Locker public immutable LOCKER;

    struct DexConfig {
        IUniswapV3FactoryMinimal dexFactory;
        INonfungiblePositionManagerMinimal positionManager;
        ISwapRouter02Minimal swapRouter;
        address weth9;
        uint24 fee;
        int24 tickSpacing;
        bool enabled;
        string name;
    }

    struct LaunchConfig {
        address pairToken;
        uint256 totalSupply;
        /// @dev Tick as if launched token were token0. Flipped when sorting differs.
        ///      -204200 ≈ ~1.37 ETH FDV on 1B supply (LaunchHood-compatible).
        int24 initialTick;
        uint16 maxWalletBps;
        uint16 maxTxBps;
        uint32 restrictionBlocks;
        bool enabled;
    }

    struct TokenParams {
        string name;
        string symbol;
        string metadataURI;
        /// @dev LP fee recipient; address(0) → msg.sender
        address rewardRecipient;
    }

    struct LaunchedToken {
        address deployer;
        address pool;
        address pairToken;
        uint256 positionId;
        uint256 launchConfigId;
        uint256 dexId;
    }

    DexConfig[] internal _dexConfigs;
    LaunchConfig[] internal _launchConfigs;
    mapping(address token => LaunchedToken) internal _launchedTokens;

    uint256 public launchFee;
    bool public launchEnabled;
    mapping(address => bool) public whitelistedLaunchers;

    event LaunchEnabledUpdated(bool enabled);
    event LaunchFeeUpdated(uint256 fee);
    event WhitelistedLauncherUpdated(address indexed launcher, bool whitelisted);
    event DexConfigAdded(uint256 indexed dexId, string name);
    event DexConfigStatusUpdated(uint256 indexed dexId, bool enabled);
    event LaunchConfigAdded(uint256 indexed configId);
    event LaunchConfigUpdated(uint256 indexed configId);

    event TokenDeployed(
        address indexed token,
        address indexed deployer,
        address indexed pairToken,
        uint256 dexId,
        uint256 launchConfigId,
        string name,
        string symbol,
        string metadataURI
    );

    event TokenLaunched(
        address indexed token,
        address indexed deployer,
        address indexed pool,
        address pairToken,
        uint256 dexId,
        uint256 launchConfigId,
        uint256 positionId,
        uint256 restrictionEndBlock,
        uint256 initialBuyEth,
        uint256 initialBuyTokens
    );

    error LaunchDisabled();
    error UnknownConfig();
    error ConfigDisabled();
    error InsufficientLaunchFee();
    error TickMisaligned();
    error PoolAlreadyInitializedAtWrongPrice();
    error InvalidConfig();
    error InitialBuyNeedsWethPair();
    error FeeSendFailed();

    constructor(
        address tokenImpl_,
        address treasury_,
        HoodV3Locker locker_,
        uint256 launchFee_
    ) Ownable(msg.sender) {
        TOKEN_IMPL = tokenImpl_;
        PROTOCOL_TREASURY = treasury_;
        LOCKER = locker_;
        launchFee = launchFee_;
        launchEnabled = true;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setLaunchEnabled(bool enabled) external onlyOwner {
        launchEnabled = enabled;
        emit LaunchEnabledUpdated(enabled);
    }

    function setLaunchFee(uint256 fee) external onlyOwner {
        launchFee = fee;
        emit LaunchFeeUpdated(fee);
    }

    function setWhitelistedLauncher(address launcher, bool whitelisted) external onlyOwner {
        whitelistedLaunchers[launcher] = whitelisted;
        emit WhitelistedLauncherUpdated(launcher, whitelisted);
    }

    function addDexConfig(DexConfig calldata d) external onlyOwner returns (uint256 dexId) {
        if (
            address(d.dexFactory) == address(0) || address(d.positionManager) == address(0)
                || address(d.swapRouter) == address(0) || d.weth9 == address(0)
        ) revert InvalidConfig();
        if (address(d.positionManager) != address(LOCKER.POSITION_MANAGER())) revert InvalidConfig();
        if (d.dexFactory.feeAmountTickSpacing(d.fee) != d.tickSpacing || d.tickSpacing <= 0) {
            revert InvalidConfig();
        }
        dexId = _dexConfigs.length;
        _dexConfigs.push(d);
        emit DexConfigAdded(dexId, d.name);
    }

    function setDexStatus(uint256 dexId, bool enabled) external onlyOwner {
        if (dexId >= _dexConfigs.length) revert UnknownConfig();
        _dexConfigs[dexId].enabled = enabled;
        emit DexConfigStatusUpdated(dexId, enabled);
    }

    function addLaunchConfig(LaunchConfig calldata c) external onlyOwner returns (uint256 configId) {
        _validateLaunchConfig(c);
        configId = _launchConfigs.length;
        _launchConfigs.push(c);
        emit LaunchConfigAdded(configId);
    }

    function updateLaunchConfig(uint256 configId, LaunchConfig calldata c) external onlyOwner {
        if (configId >= _launchConfigs.length) revert UnknownConfig();
        _validateLaunchConfig(c);
        _launchConfigs[configId] = c;
        emit LaunchConfigUpdated(configId);
    }

    function _validateLaunchConfig(LaunchConfig calldata c) internal pure {
        if (c.pairToken == address(0) || c.totalSupply == 0) revert InvalidConfig();
        if (c.maxWalletBps > 10_000 || c.maxTxBps > 10_000) revert InvalidConfig();
        if (c.initialTick <= TickMath.MIN_TICK || c.initialTick >= TickMath.MAX_TICK) {
            revert InvalidConfig();
        }
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function dexConfigCount() external view returns (uint256) {
        return _dexConfigs.length;
    }

    function getDexConfig(uint256 dexId) external view returns (DexConfig memory) {
        if (dexId >= _dexConfigs.length) revert UnknownConfig();
        return _dexConfigs[dexId];
    }

    function launchConfigCount() external view returns (uint256) {
        return _launchConfigs.length;
    }

    function getLaunchConfig(uint256 configId) external view returns (LaunchConfig memory) {
        if (configId >= _launchConfigs.length) revert UnknownConfig();
        return _launchConfigs[configId];
    }

    function getLaunchedToken(address token) external view returns (LaunchedToken memory) {
        return _launchedTokens[token];
    }

    function isHoodToken(address token) external view returns (bool) {
        return _launchedTokens[token].pool != address(0);
    }

    /// @notice Pair/pool address for a launched token (frontend / indexer).
    function pairOfToken(address token) external view returns (address) {
        return _launchedTokens[token].pool;
    }

    function predictTokenAddress(address creator, bytes32 userSalt) public view returns (address) {
        bytes32 salt = keccak256(abi.encode(creator, userSalt));
        return Clones.predictDeterministicAddress(TOKEN_IMPL, salt, address(this));
    }

    // -------------------------------------------------------------------------
    // Launch
    // -------------------------------------------------------------------------

    function launchToken(
        TokenParams calldata p,
        uint256 configId,
        uint256 dexId,
        bytes32 userSalt,
        uint256 minTokensOut
    ) external payable nonReentrant returns (address token, address pool, uint256 positionId) {
        if (!launchEnabled && !whitelistedLaunchers[msg.sender]) revert LaunchDisabled();
        if (configId >= _launchConfigs.length || dexId >= _dexConfigs.length) revert UnknownConfig();

        LaunchConfig memory cfg = _launchConfigs[configId];
        DexConfig memory dex = _dexConfigs[dexId];
        if (!cfg.enabled || !dex.enabled) revert ConfigDisabled();
        if (msg.value < launchFee) revert InsufficientLaunchFee();

        token = Clones.cloneDeterministic(TOKEN_IMPL, keccak256(abi.encode(msg.sender, userSalt)));
        HoodV3Token(token).initialize(
            p.name,
            p.symbol,
            p.metadataURI,
            msg.sender,
            address(LOCKER),
            cfg.totalSupply,
            cfg.maxWalletBps,
            cfg.maxTxBps,
            cfg.restrictionBlocks
        );

        emit TokenDeployed(
            token, msg.sender, cfg.pairToken, dexId, configId, p.name, p.symbol, p.metadataURI
        );

        uint256 initialBuyEth = msg.value - launchFee;
        positionId = _createPoolAndLock(token, cfg, dex);
        pool = _launchedPool(token, cfg.pairToken, dex);

        HoodV3Token(token).setPool(pool);

        LOCKER.register(
            positionId,
            p.rewardRecipient == address(0) ? msg.sender : p.rewardRecipient,
            token,
            cfg.pairToken
        );

        _launchedTokens[token] = LaunchedToken({
            deployer: msg.sender,
            pool: pool,
            pairToken: cfg.pairToken,
            positionId: positionId,
            launchConfigId: configId,
            dexId: dexId
        });

        if (launchFee > 0) {
            (bool ok,) = PROTOCOL_TREASURY.call{value: launchFee}("");
            if (!ok) revert FeeSendFailed();
        }

        uint256 boughtTokens;
        if (initialBuyEth > 0) {
            if (cfg.pairToken != dex.weth9) revert InitialBuyNeedsWethPair();
            boughtTokens = dex.swapRouter.exactInputSingle{value: initialBuyEth}(
                ISwapRouter02Minimal.ExactInputSingleParams({
                    tokenIn: dex.weth9,
                    tokenOut: token,
                    fee: dex.fee,
                    recipient: msg.sender,
                    amountIn: initialBuyEth,
                    amountOutMinimum: minTokensOut,
                    sqrtPriceLimitX96: 0
                })
            );
        }

        HoodV3Token(token).activateLimits();

        emit TokenLaunched(
            token,
            msg.sender,
            pool,
            cfg.pairToken,
            dexId,
            configId,
            positionId,
            HoodV3Token(token).restrictionEndBlock(),
            initialBuyEth,
            boughtTokens
        );
    }

    function _createPoolAndLock(address token, LaunchConfig memory cfg, DexConfig memory dex)
        internal
        returns (uint256 positionId)
    {
        (address token0, address token1) =
            token < cfg.pairToken ? (token, cfg.pairToken) : (cfg.pairToken, token);
        bool tokenIsToken0 = token0 == token;

        int24 initialTick = tokenIsToken0 ? cfg.initialTick : -cfg.initialTick;
        if (initialTick % dex.tickSpacing != 0) revert TickMisaligned();

        int24 maxUsable = (TickMath.MAX_TICK / dex.tickSpacing) * dex.tickSpacing;
        (int24 tickLower, int24 tickUpper) =
            tokenIsToken0 ? (initialTick, maxUsable) : (-maxUsable, initialTick);

        dex.positionManager.createAndInitializePoolIfNecessary(
            token0, token1, dex.fee, TickMath.getSqrtPriceAtTick(initialTick)
        );

        address pool = dex.dexFactory.getPool(token0, token1, dex.fee);
        (, int24 poolTick,,,,,) = IUniswapV3PoolMinimal(pool).slot0();
        if (poolTick != initialTick) revert PoolAlreadyInitializedAtWrongPrice();

        IERC20(token).forceApprove(address(dex.positionManager), cfg.totalSupply);

        (uint256 amount0Desired, uint256 amount1Desired) =
            tokenIsToken0 ? (cfg.totalSupply, uint256(0)) : (uint256(0), cfg.totalSupply);

        (positionId,,,) = dex.positionManager.mint(
            INonfungiblePositionManagerMinimal.MintParams({
                token0: token0,
                token1: token1,
                fee: dex.fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(LOCKER),
                deadline: block.timestamp
            })
        );
    }

    function _launchedPool(address token, address pairToken, DexConfig memory dex)
        internal
        view
        returns (address)
    {
        (address token0, address token1) =
            token < pairToken ? (token, pairToken) : (pairToken, token);
        return dex.dexFactory.getPool(token0, token1, dex.fee);
    }
}
