// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodToken} from "./HoodToken.sol";
import {IUniswapV2Router02, IUniswapV2Factory} from "./IUniswapV2.sol";

/// @title HoodInstantFactory — fixed supply + creator allocation + instant Uniswap V2 LP
/// @notice One tx: mint → send creator % to launcher → seed rest as TOKEN/WETH LP → optional LP burn
contract HoodInstantFactory {
    uint256 public constant SUPPLY_1B = 1_000_000_000 ether;
    uint256 public constant SUPPLY_5B = 5_000_000_000 ether;
    uint256 public constant SUPPLY_10B = 10_000_000_000 ether;
    uint256 public constant SUPPLY_100B = 100_000_000_000 ether;
    uint256 public constant SUPPLY_1T = 1_000_000_000_000 ether;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_CREATOR_BPS = 1_000; // 10%

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    address public owner;
    address public protocol;
    address public uniswapRouter;
    uint256 public createFee;
    uint256 public minLpEth;

    struct Launch {
        address token;
        address pair;
        address creator;
        uint256 totalSupply;
        uint256 lpEth;
        bool lpBurned;
        uint64 createdAt;
        uint16 creatorBps; // e.g. 500 = 5%
    }

    address[] public allTokens;
    mapping(address => Launch) public launches;
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
        bool lpBurned,
        uint16 creatorBps,
        uint256 creatorTokens
    );
    event CreateFeeUpdated(uint256 fee);
    event MinLpEthUpdated(uint256 minLp);
    event ProtocolUpdated(address protocol);
    event RouterUpdated(address router);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error OnlyOwner();
    error InsufficientLp();
    error ZeroAddress();
    error InvalidSupply();
    error InvalidCreatorBps();
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

    /// @notice Allowed: 0, 100 (1%), 500 (5%), 1000 (10%)
    function isAllowedCreatorBps(uint16 bps) public pure returns (bool) {
        return bps == 0 || bps == 100 || bps == 500 || bps == 1000;
    }

    /**
     * @param totalSupply Fixed max supply (preset)
     * @param burnLp LP to dead if true, else to creator
     * @param creatorBps 0 / 100 / 500 / 1000 — % of supply sent to creator wallet; rest → Uni LP
     * @dev msg.value = createFee + LP ETH
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        bool burnLp,
        uint16 creatorBps
    ) external payable returns (address token, address pair) {
        if (!isAllowedSupply(totalSupply)) revert InvalidSupply();
        if (!isAllowedCreatorBps(creatorBps)) revert InvalidCreatorBps();
        if (uniswapRouter == address(0)) revert ZeroAddress();
        if (msg.value < createFee + minLpEth) revert InsufficientLp();

        uint256 lpEth = msg.value - createFee;
        if (lpEth < minLpEth) revert InsufficientLp();

        if (createFee > 0) {
            (bool okFee,) = protocol.call{value: createFee}("");
            if (!okFee) revert TransferFailed();
        }

        HoodToken t = new HoodToken(name, symbol, totalSupply, msg.sender);
        token = address(t);
        t.mintInitial(totalSupply);

        uint256 creatorTokens = (totalSupply * uint256(creatorBps)) / BPS;
        uint256 lpTokens = totalSupply - creatorTokens;

        if (creatorTokens > 0) {
            require(t.transfer(msg.sender, creatorTokens), "creator xfer");
        }

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        address weth = router.WETH();
        address uniFactory = router.factory();

        t.approve(uniswapRouter, lpTokens);
        address lpRecipient = burnLp ? DEAD : msg.sender;

        (uint256 usedToken, uint256 usedEth,) = router.addLiquidityETH{value: lpEth}(
            token,
            lpTokens,
            0,
            0,
            lpRecipient,
            block.timestamp + 600
        );

        pair = IUniswapV2Factory(uniFactory).getPair(token, weth);
        require(pair != address(0), "no pair");

        uint256 dustTok = t.balanceOf(address(this));
        if (dustTok > 0) {
            t.burn(dustTok);
        }
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
            createdAt: uint64(block.timestamp),
            creatorBps: creatorBps
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
            burnLp,
            creatorBps,
            creatorTokens
        );

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
