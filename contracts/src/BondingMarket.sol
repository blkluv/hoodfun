// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodToken} from "./HoodToken.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair} from "./IUniswapV2.sol";

struct FeeConfig {
    uint16 buyFeeBps;
    uint16 sellFeeBps;
    uint16 feeCreatorBps;
    uint16 feeProtocolBps;
    uint16 feeBuybackBurnBps;
    uint16 tokenBurnOnBuyBps;
}

/// @title BondingMarket v2 — fixed supply + Uniswap V2 graduation
contract BondingMarket {
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_TRADE_FEE_BPS = 1_000;
    uint256 public constant MAX_TOKEN_BURN_BPS = 2_000;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 public virtualEth;
    uint256 public virtualToken;
    uint256 public realEth;
    uint256 public immutable totalSupplyFixed;
    uint256 public immutable graduateThreshold;

    HoodToken public immutable token;
    address public immutable factory;
    address public immutable creator;
    address public immutable protocol;
    address public immutable uniswapRouter;

    FeeConfig public fees;
    bool public graduated;
    address public uniswapPair;

    bool private locked;

    event Buy(
        address indexed buyer,
        address indexed recipient,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 tokensBurned,
        uint256 feeEth
    );
    event Sell(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 feeEth);
    event FeeDistributed(
        uint256 toCreator,
        uint256 toProtocol,
        uint256 buybackBurnEth,
        uint256 tokensBoughtAndBurned
    );
    event CreatorBurn(address indexed creator, uint256 amount);
    event Graduated(
        address indexed pair,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 lpBurned
    );

    error Reentrancy();
    error InvalidFees();
    error Slippage();
    error ZeroAmount();
    error InsufficientLiquidity();
    error TransferFailed();
    error AlreadyGraduated();
    error NotReadyToGraduate();
    error GraduatedOnly();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    modifier notGraduated() {
        if (graduated) revert AlreadyGraduated();
        _;
    }

    constructor(
        address creator_,
        address protocol_,
        string memory name_,
        string memory symbol_,
        FeeConfig memory fees_,
        uint256 totalSupply_,
        uint256 virtualEth_,
        uint256 graduateThreshold_,
        address uniswapRouter_
    ) {
        _validateFees(fees_);
        require(totalSupply_ >= 1_000_000 ether, "supply too small");
        require(uniswapRouter_ != address(0), "router");
        factory = msg.sender;
        creator = creator_;
        protocol = protocol_;
        fees = fees_;
        totalSupplyFixed = totalSupply_;
        virtualEth = virtualEth_;
        virtualToken = totalSupply_; // entire fixed supply sits on the curve
        graduateThreshold = graduateThreshold_;
        uniswapRouter = uniswapRouter_;

        token = new HoodToken(name_, symbol_, totalSupply_, creator_);
        token.mintInitial(totalSupply_); // market holds 100% inventory
    }

    function _validateFees(FeeConfig memory f) internal pure {
        if (f.buyFeeBps > MAX_TRADE_FEE_BPS || f.sellFeeBps > MAX_TRADE_FEE_BPS) {
            revert InvalidFees();
        }
        if (f.tokenBurnOnBuyBps > MAX_TOKEN_BURN_BPS) revert InvalidFees();
        if (uint256(f.feeCreatorBps) + f.feeProtocolBps + f.feeBuybackBurnBps != BPS) {
            revert InvalidFees();
        }
    }

    function getBuyQuote(uint256 ethIn)
        public
        view
        returns (uint256 tokensOut, uint256 tokensBurned, uint256 feeEth)
    {
        if (ethIn == 0 || graduated) return (0, 0, 0);
        feeEth = (ethIn * fees.buyFeeBps) / BPS;
        uint256 tradeEth = ethIn - feeEth;
        tokensOut = _getAmountOut(tradeEth, virtualEth, virtualToken);
        tokensBurned = (tokensOut * fees.tokenBurnOnBuyBps) / BPS;
        tokensOut = tokensOut - tokensBurned;
        // also estimate buyback burn from fee (not given to user)
        uint256 buybackEth = (feeEth * fees.feeBuybackBurnBps) / BPS;
        if (buybackEth > 0) {
            uint256 vEth = virtualEth + tradeEth;
            uint256 vTok = virtualToken - (tokensOut + tokensBurned);
            uint256 bb = _getAmountOut(buybackEth, vEth, vTok);
            tokensBurned += bb;
        }
    }

    function getSellQuote(uint256 tokensIn)
        public
        view
        returns (uint256 ethOut, uint256 feeEth)
    {
        if (tokensIn == 0 || graduated) return (0, 0);
        uint256 gross = _getAmountOut(tokensIn, virtualToken, virtualEth);
        if (gross > realEth) gross = realEth;
        feeEth = (gross * fees.sellFeeBps) / BPS;
        ethOut = gross - feeEth;
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        return (reserveOut * amountIn) / (reserveIn + amountIn);
    }

    function buy(address recipient, uint256 minTokensOut)
        external
        payable
        nonReentrant
        notGraduated
        returns (uint256 tokensToUser)
    {
        if (msg.value == 0) revert ZeroAmount();
        if (recipient == address(0)) recipient = msg.sender;

        FeeConfig memory f = fees;
        uint256 feeEth = (msg.value * f.buyFeeBps) / BPS;
        uint256 tradeEth = msg.value - feeEth;

        uint256 tokensOut = _getAmountOut(tradeEth, virtualEth, virtualToken);
        if (tokensOut == 0 || tokensOut > virtualToken) revert InsufficientLiquidity();
        // cannot sell more than market inventory
        uint256 inv = token.balanceOf(address(this));
        if (tokensOut > inv) revert InsufficientLiquidity();

        virtualEth += tradeEth;
        virtualToken -= tokensOut;
        realEth += tradeEth;

        uint256 tokenBurn = (tokensOut * f.tokenBurnOnBuyBps) / BPS;
        tokensToUser = tokensOut - tokenBurn;

        // burn deflationary slice from inventory
        if (tokenBurn > 0) {
            token.burnFrom(address(this), tokenBurn);
        }

        uint256 bbTokens = _distributeFee(feeEth);

        if (tokensToUser < minTokensOut) revert Slippage();
        if (tokensToUser > 0) {
            // transfer from market inventory (fixed supply)
            require(token.transfer(recipient, tokensToUser), "xfer");
        }

        realEth = address(this).balance;
        emit Buy(msg.sender, recipient, msg.value, tokensToUser, tokenBurn + bbTokens, feeEth);

        // auto-graduate when threshold hit
        if (realEth >= graduateThreshold) {
            _graduate();
        }
    }

    function sell(uint256 tokensIn, uint256 minEthOut)
        external
        nonReentrant
        notGraduated
        returns (uint256 ethToUser)
    {
        if (tokensIn == 0) revert ZeroAmount();

        uint256 gross = _getAmountOut(tokensIn, virtualToken, virtualEth);
        if (gross == 0 || gross > realEth) revert InsufficientLiquidity();

        FeeConfig memory f = fees;
        uint256 feeEth = (gross * f.sellFeeBps) / BPS;
        ethToUser = gross - feeEth;
        if (ethToUser < minEthOut) revert Slippage();

        // pull tokens back into market inventory
        require(token.transferFrom(msg.sender, address(this), tokensIn), "xfer in");

        virtualToken += tokensIn;
        virtualEth -= gross;

        (bool ok,) = msg.sender.call{value: ethToUser}("");
        if (!ok) revert TransferFailed();

        _distributeFee(feeEth);
        realEth = address(this).balance;

        emit Sell(msg.sender, tokensIn, ethToUser, feeEth);
    }

    function burnTokens(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        token.burnFrom(msg.sender, amount);
        if (msg.sender == creator) emit CreatorBurn(msg.sender, amount);
    }

    /// @notice Seed Uniswap V2 TOKEN/WETH pool and burn LP. Callable once threshold met.
    function graduate() external nonReentrant notGraduated {
        if (realEth < graduateThreshold) revert NotReadyToGraduate();
        _graduate();
    }

    function _graduate() internal {
        if (graduated) return;
        graduated = true;

        uint256 tokenBal = token.balanceOf(address(this));
        uint256 ethBal = address(this).balance;
        require(tokenBal > 0 && ethBal > 0, "empty");

        // approve router
        token.approve(uniswapRouter, tokenBal);

        IUniswapV2Router02 router = IUniswapV2Router02(uniswapRouter);
        address weth = router.WETH();
        address uniFactory = router.factory();

        // add liquidity; LP to this contract then burn
        (uint256 usedToken, uint256 usedEth, uint256 lp) = router.addLiquidityETH{
            value: ethBal
        }(address(token), tokenBal, 0, 0, address(this), block.timestamp + 600);

        address pair = IUniswapV2Factory(uniFactory).getPair(address(token), weth);
        uniswapPair = pair;

        // burn remaining tokens not used in LP (dust)
        uint256 leftoverTok = token.balanceOf(address(this));
        if (leftoverTok > 0) {
            token.burnFrom(address(this), leftoverTok);
        }

        // burn LP
        uint256 lpBal = IUniswapV2Pair(pair).balanceOf(address(this));
        if (lpBal > 0) {
            require(IUniswapV2Pair(pair).transfer(DEAD, lpBal), "lp burn");
        }

        // any leftover ETH → protocol
        uint256 dust = address(this).balance;
        if (dust > 0) {
            (bool p,) = protocol.call{value: dust}("");
            if (!p) revert TransferFailed();
        }

        realEth = 0;
        emit Graduated(pair, usedEth, usedToken, lp);
    }

    function _distributeFee(uint256 feeEth)
        internal
        returns (uint256 tokensBoughtAndBurned)
    {
        if (feeEth == 0) {
            emit FeeDistributed(0, 0, 0, 0);
            return 0;
        }

        FeeConfig memory f = fees;
        uint256 toCreator = (feeEth * f.feeCreatorBps) / BPS;
        uint256 toProtocol = (feeEth * f.feeProtocolBps) / BPS;
        uint256 buybackEth = feeEth - toCreator - toProtocol;

        if (toCreator > 0) {
            (bool c,) = creator.call{value: toCreator}("");
            if (!c) {
                // creator may be a contract without receive — fall back to protocol
                toProtocol += toCreator;
                toCreator = 0;
            }
        }
        if (toProtocol > 0) {
            (bool p,) = protocol.call{value: toProtocol}("");
            if (!p) {
                // keep ETH in market rather than bricking trades
            }
        }

        if (buybackEth > 0 && !graduated) {
            tokensBoughtAndBurned = _getAmountOut(buybackEth, virtualEth, virtualToken);
            uint256 inv = token.balanceOf(address(this));
            if (
                tokensBoughtAndBurned > 0 && tokensBoughtAndBurned < virtualToken
                    && tokensBoughtAndBurned <= inv
            ) {
                virtualEth += buybackEth;
                virtualToken -= tokensBoughtAndBurned;
                realEth += buybackEth;
                token.burnFrom(address(this), tokensBoughtAndBurned);
            } else {
                (bool p2,) = protocol.call{value: buybackEth}("");
                if (!p2) revert TransferFailed();
                buybackEth = 0;
                tokensBoughtAndBurned = 0;
            }
        } else if (buybackEth > 0) {
            (bool p3,) = protocol.call{value: buybackEth}("");
            if (!p3) revert TransferFailed();
        }

        emit FeeDistributed(toCreator, toProtocol, buybackEth, tokensBoughtAndBurned);
    }

    receive() external payable {
        // allow router refunds only after graduation path
        if (!graduated) revert("use buy()");
    }
}
