// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodToken} from "./HoodToken.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair} from "./IUniswapV2.sol";

/// @title HoodInstantFactory — NOXA-style: fixed supply + instant Uniswap V2 LP
/// @notice One tx: mint fixed supply → seed TOKEN/WETH pool → optional LP burn
contract HoodInstantFactory {
    uint256 public constant SUPPLY_1B = 1_000_000_000 ether;
    uint256 public constant SUPPLY_5B = 5_000_000_000 ether;
    uint256 public constant SUPPLY_10B = 10_000_000_000 ether;
    uint256 public constant SUPPLY_100B = 100_000_000_000 ether;
    uint256 public constant SUPPLY_1T = 1_000_000_000_000 ether;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    address public owner;
    address public protocol;
    address public uniswapRouter;
    uint256 public createFee; // ETH to protocol on each launch
    uint256 public minLpEth; // minimum liquidity ETH

    struct Launch {
        address token;
        address pair;
        address creator;
        uint256 totalSupply;
        uint256 lpEth;
        bool lpBurned;
        uint64 createdAt;
    }

    address[] public allTokens;
    mapping(address => Launch) public launches; // token => Launch
    mapping(address => address) public pairOfToken;
    mapping(address => address[]) public tokensByCreator;

    event TokenLaunched(
        address indexed token,
        address indexed pair,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 lpEth,
        uint256 createFeePaid,
        bool lpBurned
    );
    event CreateFeeUpdated(uint256 fee);
    event MinLpEthUpdated(uint256 minLp);
    event ProtocolUpdated(address protocol);
    event RouterUpdated(address router);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error OnlyOwner();
    error InsufficientFee();
    error InsufficientLp();
    error ZeroAddress();
    error InvalidSupply();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address protocol_,
        address uniswapRouter_,
        uint256 createFee_,
        uint256 minLpEth_
    ) {
        owner = msg.sender;
        protocol = protocol_ == address(0) ? msg.sender : protocol_;
        uniswapRouter = uniswapRouter_;
        createFee = createFee_;
        minLpEth = minLpEth_ == 0 ? 0.01 ether : minLpEth_;
    }

    function isAllowedSupply(uint256 supply) public pure returns (bool) {
        return supply == SUPPLY_1B || supply == SUPPLY_5B || supply == SUPPLY_10B
            || supply == SUPPLY_100B || supply == SUPPLY_1T;
    }

    /**
     * @param name Token name
     * @param symbol Ticker
     * @param totalSupply One of allowed presets
     * @param burnLp If true, LP goes to dead address; if false, LP goes to creator
     * @dev msg.value = createFee + LP ETH (rest after fee seeds the pool)
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        bool burnLp
    ) external payable returns (address token, address pair) {
        if (!isAllowedSupply(totalSupply)) revert InvalidSupply();
        if (uniswapRouter == address(0)) revert ZeroAddress();
        if (msg.value < createFee + minLpEth) revert InsufficientLp();

        uint256 lpEth = msg.value - createFee;
        if (lpEth < minLpEth) revert InsufficientLp();

        // protocol fee
        if (createFee > 0) {
            (bool okFee,) = protocol.call{value: createFee}("");
            if (!okFee) revert TransferFailed();
        }

        // mint fixed supply to this factory
        HoodToken t = new HoodToken(name, symbol, totalSupply, msg.sender);
        token = address(t);
        t.mintInitial(totalSupply);

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        address weth = router.WETH();
        address uniFactory = router.factory();

        // approve + add liquidity (100% of supply + lpEth)
        t.approve(uniswapRouter, totalSupply);
        address lpRecipient = burnLp ? DEAD : msg.sender;

        (uint256 usedToken, uint256 usedEth,) = router.addLiquidityETH{value: lpEth}(
            token,
            totalSupply,
            0,
            0,
            lpRecipient,
            block.timestamp + 600
        );

        pair = IUniswapV2Factory(uniFactory).getPair(token, weth);
        require(pair != address(0), "no pair");

        // burn any dust tokens not used in LP
        uint256 dustTok = t.balanceOf(address(this));
        if (dustTok > 0) {
            t.burn(dustTok);
        }
        // refund dust ETH to creator
        uint256 dustEth = address(this).balance;
        if (dustEth > 0) {
            (bool ok,) = msg.sender.call{value: dustEth}("");
            if (!ok) revert TransferFailed();
        }

        launches[token] = Launch({
            token: token,
            pair: pair,
            creator: msg.sender,
            totalSupply: totalSupply,
            lpEth: usedEth,
            lpBurned: burnLp,
            createdAt: uint64(block.timestamp)
        });
        allTokens.push(token);
        pairOfToken[token] = pair;
        tokensByCreator[msg.sender].push(token);

        emit TokenLaunched(
            token,
            pair,
            msg.sender,
            name,
            symbol,
            totalSupply,
            usedEth,
            createFee,
            burnLp
        );

        // silence unused warning if router returns unused amountToken edge case
        usedToken;
    }

    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokens(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory out)
    {
        uint256 n = allTokens.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = allTokens[i];
        }
    }

    function setCreateFee(uint256 fee) external onlyOwner {
        createFee = fee;
        emit CreateFeeUpdated(fee);
    }

    function setMinLpEth(uint256 v) external onlyOwner {
        minLpEth = v;
        emit MinLpEthUpdated(v);
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

    receive() external payable {}
}
