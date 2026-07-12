// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BondingMarket, FeeConfig} from "./BondingMarket.sol";
import {HoodToken} from "./HoodToken.sol";

/// @title HoodFactory — create memecoins on Robinhood Chain with creator buy + fee presets
contract HoodFactory {
    uint256 public constant DEFAULT_VIRTUAL_ETH = 1.5 ether;
    uint256 public constant DEFAULT_VIRTUAL_TOKEN = 1_073_000_000 ether; // ~1.073B

    address public owner;
    address public protocol;
    uint256 public createFee; // anti-spam (ETH)

    address[] public allMarkets;
    mapping(address => address) public marketOfToken; // token => market
    mapping(address => address[]) public marketsByCreator;

    event TokenCreated(
        address indexed market,
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialBuyEth,
        uint256 createFeePaid
    );
    event CreateFeeUpdated(uint256 fee);
    event ProtocolUpdated(address protocol);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error OnlyOwner();
    error InsufficientFee();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address protocol_, uint256 createFee_) {
        owner = msg.sender;
        protocol = protocol_ == address(0) ? msg.sender : protocol_;
        createFee = createFee_;
    }

    /// @notice Launch a token. `msg.value` = createFee + optional creator initial buy ETH.
    /// @param initialBuyMinTokens slippage guard for creator's first buy (0 if no buy)
    function createToken(
        string calldata name,
        string calldata symbol,
        FeeConfig calldata fees,
        uint256 initialBuyMinTokens
    ) external payable returns (address market, address token) {
        if (msg.value < createFee) revert InsufficientFee();

        uint256 buyEth = msg.value - createFee;

        BondingMarket m = new BondingMarket(
            msg.sender,
            protocol,
            name,
            symbol,
            fees,
            DEFAULT_VIRTUAL_ETH,
            DEFAULT_VIRTUAL_TOKEN
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

        // Creator buy supply at launch (industry standard "dev buy")
        if (buyEth > 0) {
            m.buy{value: buyEth}(msg.sender, initialBuyMinTokens);
        }

        emit TokenCreated(market, token, msg.sender, name, symbol, buyEth, createFee);
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

    function setProtocol(address p) external onlyOwner {
        if (p == address(0)) revert ZeroAddress();
        protocol = p;
        emit ProtocolUpdated(p);
    }

    function transferOwnership(address n) external onlyOwner {
        if (n == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, n);
        owner = n;
    }
}
