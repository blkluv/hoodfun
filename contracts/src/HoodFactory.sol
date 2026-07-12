// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BondingMarket, FeeConfig} from "./BondingMarket.sol";

/// @title HoodFactory v2 — fixed supply presets + Uniswap graduation
contract HoodFactory {
    /// @dev Preset total supplies (18 decimals): 1B, 5B, 10B, 100B, 1T
    uint256 public constant SUPPLY_1B = 1_000_000_000 ether;
    uint256 public constant SUPPLY_5B = 5_000_000_000 ether;
    uint256 public constant SUPPLY_10B = 10_000_000_000 ether;
    uint256 public constant SUPPLY_100B = 100_000_000_000 ether;
    uint256 public constant SUPPLY_1T = 1_000_000_000_000 ether;

    uint256 public constant DEFAULT_VIRTUAL_ETH = 1.5 ether;

    address public owner;
    address public protocol;
    address public uniswapRouter;
    uint256 public createFee;
    /// @notice ETH raised on curve before auto-graduate to Uniswap
    uint256 public graduateThreshold;

    address[] public allMarkets;
    mapping(address => address) public marketOfToken;
    mapping(address => address[]) public marketsByCreator;

    event TokenCreated(
        address indexed market,
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 initialBuyEth,
        uint256 createFeePaid,
        uint256 graduateThreshold
    );
    event CreateFeeUpdated(uint256 fee);
    event GraduateThresholdUpdated(uint256 threshold);
    event ProtocolUpdated(address protocol);
    event RouterUpdated(address router);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error OnlyOwner();
    error InsufficientFee();
    error ZeroAddress();
    error InvalidSupply();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address protocol_,
        address uniswapRouter_,
        uint256 createFee_,
        uint256 graduateThreshold_
    ) {
        owner = msg.sender;
        protocol = protocol_ == address(0) ? msg.sender : protocol_;
        uniswapRouter = uniswapRouter_;
        createFee = createFee_;
        graduateThreshold = graduateThreshold_ == 0 ? 0.25 ether : graduateThreshold_;
    }

    function isAllowedSupply(uint256 supply) public pure returns (bool) {
        return supply == SUPPLY_1B || supply == SUPPLY_5B || supply == SUPPLY_10B
            || supply == SUPPLY_100B || supply == SUPPLY_1T;
    }

    /// @param totalSupply Must be one of the allowed presets (1B / 5B / 10B / 100B / 1T)
    function createToken(
        string calldata name,
        string calldata symbol,
        FeeConfig calldata fees,
        uint256 totalSupply,
        uint256 initialBuyMinTokens
    ) external payable returns (address market, address token) {
        if (msg.value < createFee) revert InsufficientFee();
        if (!isAllowedSupply(totalSupply)) revert InvalidSupply();
        if (uniswapRouter == address(0)) revert ZeroAddress();

        uint256 buyEth = msg.value - createFee;

        BondingMarket m = new BondingMarket(
            msg.sender,
            protocol,
            name,
            symbol,
            fees,
            totalSupply,
            DEFAULT_VIRTUAL_ETH,
            graduateThreshold,
            uniswapRouter
        );
        market = address(m);
        token = address(m.token());

        allMarkets.push(market);
        marketOfToken[token] = market;
        marketsByCreator[msg.sender].push(market);

        if (createFee > 0) {
            (bool ok,) = protocol.call{value: createFee}("");
            require(ok, "fee xfer");
        }

        if (buyEth > 0) {
            m.buy{value: buyEth}(msg.sender, initialBuyMinTokens);
        }

        emit TokenCreated(
            market,
            token,
            msg.sender,
            name,
            symbol,
            totalSupply,
            buyEth,
            createFee,
            graduateThreshold
        );
    }

    function allMarketsLength() external view returns (uint256) {
        return allMarkets.length;
    }

    function getMarkets(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory out)
    {
        uint256 n = allMarkets.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = allMarkets[i];
        }
    }

    function setCreateFee(uint256 fee) external onlyOwner {
        createFee = fee;
        emit CreateFeeUpdated(fee);
    }

    function setGraduateThreshold(uint256 t) external onlyOwner {
        graduateThreshold = t;
        emit GraduateThresholdUpdated(t);
    }

    function setProtocol(address p) external onlyOwner {
        if (p == address(0)) revert ZeroAddress();
        protocol = p;
        emit ProtocolUpdated(p);
    }

    function setUniswapRouter(address r) external onlyOwner {
        if (r == address(0)) revert ZeroAddress();
        uniswapRouter = r;
        emit RouterUpdated(r);
    }

    function transferOwnership(address n) external onlyOwner {
        if (n == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, n);
        owner = n;
    }
}
