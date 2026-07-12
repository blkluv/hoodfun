// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodToken} from "./HoodToken.sol";

/// @notice Industry-standard fee split for launchpad markets
/// @dev feeCreatorBps + feeProtocolBps + feeBuybackBurnBps MUST equal 10_000
struct FeeConfig {
    uint16 buyFeeBps; // fee on buy ETH in, max 1000 (10%)
    uint16 sellFeeBps; // fee on sell ETH out, max 1000
    uint16 feeCreatorBps; // share of fee → creator
    uint16 feeProtocolBps; // share of fee → protocol treasury
    uint16 feeBuybackBurnBps; // share of fee → buy tokens & burn
    uint16 tokenBurnOnBuyBps; // of tokens purchased, burned (not minted to buyer), max 2000
}

/// @title BondingMarket — constant-product curve with fees, buyback-burn, creator buy
contract BondingMarket {
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_TRADE_FEE_BPS = 1_000; // 10%
    uint256 public constant MAX_TOKEN_BURN_BPS = 2_000; // 20%

    // Virtual reserves (pump-style); realEth tracks ETH held for sells/grad
    uint256 public virtualEth;
    uint256 public virtualToken;
    uint256 public realEth;

    HoodToken public immutable token;
    address public immutable factory;
    address public immutable creator;
    address public immutable protocol;

    FeeConfig public fees;

    bool private locked;

    event Buy(
        address indexed buyer,
        address indexed recipient,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 tokensBurned,
        uint256 feeEth
    );
    event Sell(
        address indexed seller,
        uint256 tokensIn,
        uint256 ethOut,
        uint256 feeEth
    );
    event FeeDistributed(
        uint256 toCreator,
        uint256 toProtocol,
        uint256 buybackBurnEth,
        uint256 tokensBoughtAndBurned
    );
    event CreatorBurn(address indexed creator, uint256 amount);

    error Reentrancy();
    error InvalidFees();
    error Slippage();
    error ZeroAmount();
    error InsufficientLiquidity();
    error TransferFailed();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(
        address creator_,
        address protocol_,
        string memory name_,
        string memory symbol_,
        FeeConfig memory fees_,
        uint256 virtualEth_,
        uint256 virtualToken_
    ) {
        _validateFees(fees_);
        factory = msg.sender;
        creator = creator_;
        protocol = protocol_;
        fees = fees_;
        virtualEth = virtualEth_;
        virtualToken = virtualToken_;
        token = new HoodToken(name_, symbol_, creator_);
    }

    function _validateFees(FeeConfig memory f) internal pure {
        if (f.buyFeeBps > MAX_TRADE_FEE_BPS || f.sellFeeBps > MAX_TRADE_FEE_BPS) {
            revert InvalidFees();
        }
        if (f.tokenBurnOnBuyBps > MAX_TOKEN_BURN_BPS) revert InvalidFees();
        if (
            uint256(f.feeCreatorBps) + f.feeProtocolBps + f.feeBuybackBurnBps
                != BPS
        ) {
            revert InvalidFees();
        }
    }

    // ─── Quotes ───────────────────────────────────────────────────────────

    function getBuyQuote(uint256 ethIn)
        public
        view
        returns (uint256 tokensOut, uint256 tokensBurned, uint256 feeEth)
    {
        if (ethIn == 0) return (0, 0, 0);
        feeEth = (ethIn * fees.buyFeeBps) / BPS;
        uint256 tradeEth = ethIn - feeEth;
        // Approximate buyback-burn consuming fee share (same curve, no nested fee)
        uint256 buybackEth = (feeEth * fees.feeBuybackBurnBps) / BPS;
        uint256 vEth = virtualEth;
        uint256 vTok = virtualToken;
        // first apply trade
        tokensOut = _getAmountOut(tradeEth, vEth, vTok);
        vEth += tradeEth;
        vTok -= tokensOut;
        // buyback burn tokens (not given to user)
        if (buybackEth > 0 && vTok > 0) {
            uint256 bb = _getAmountOut(buybackEth, vEth, vTok);
            // bb tokens never minted → burned from curve supply
            tokensBurned = (tokensOut * fees.tokenBurnOnBuyBps) / BPS + bb;
            tokensOut = tokensOut - (tokensOut * fees.tokenBurnOnBuyBps) / BPS;
        } else {
            tokensBurned = (tokensOut * fees.tokenBurnOnBuyBps) / BPS;
            tokensOut = tokensOut - tokensBurned;
        }
    }

    function getSellQuote(uint256 tokensIn)
        public
        view
        returns (uint256 ethOut, uint256 feeEth)
    {
        if (tokensIn == 0) return (0, 0);
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
        // x*y=k → dy = y * dx / (x + dx)
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        return (reserveOut * amountIn) / (reserveIn + amountIn);
    }

    // ─── Trade ────────────────────────────────────────────────────────────

    /// @notice Buy tokens with ETH. Creator initial buy uses recipient = creator.
    function buy(address recipient, uint256 minTokensOut)
        external
        payable
        nonReentrant
        returns (uint256 tokensToUser)
    {
        if (msg.value == 0) revert ZeroAmount();
        if (recipient == address(0)) recipient = msg.sender;

        FeeConfig memory f = fees;
        uint256 feeEth = (msg.value * f.buyFeeBps) / BPS;
        uint256 tradeEth = msg.value - feeEth;

        uint256 tokensOut = _getAmountOut(tradeEth, virtualEth, virtualToken);
        if (tokensOut == 0 || tokensOut >= virtualToken) revert InsufficientLiquidity();

        // update curve for trade leg
        virtualEth += tradeEth;
        virtualToken -= tokensOut;
        realEth += tradeEth;

        // deflationary: burn % of purchased tokens (never mint)
        uint256 tokenBurn = (tokensOut * f.tokenBurnOnBuyBps) / BPS;
        tokensToUser = tokensOut - tokenBurn;

        // distribute fee (may buyback-burn more)
        uint256 bbTokens = _distributeFee(feeEth);

        if (tokensToUser < minTokensOut) revert Slippage();

        if (tokensToUser > 0) {
            token.mint(recipient, tokensToUser);
        }

        realEth = address(this).balance;
        emit Buy(msg.sender, recipient, msg.value, tokensToUser, tokenBurn + bbTokens, feeEth);
    }

    function sell(uint256 tokensIn, uint256 minEthOut)
        external
        nonReentrant
        returns (uint256 ethToUser)
    {
        if (tokensIn == 0) revert ZeroAmount();

        uint256 gross = _getAmountOut(tokensIn, virtualToken, virtualEth);
        if (gross == 0) revert InsufficientLiquidity();
        if (gross > realEth) revert InsufficientLiquidity();

        FeeConfig memory f = fees;
        uint256 feeEth = (gross * f.sellFeeBps) / BPS;
        ethToUser = gross - feeEth;
        if (ethToUser < minEthOut) revert Slippage();

        // pull & burn tokens from seller
        token.burnFrom(msg.sender, tokensIn);

        virtualToken += tokensIn;
        virtualEth -= gross;

        (bool ok,) = msg.sender.call{value: ethToUser}("");
        if (!ok) revert TransferFailed();

        // remaining gross - ethToUser = feeEth stays in contract for distribution
        _distributeFee(feeEth);
        realEth = address(this).balance;

        emit Sell(msg.sender, tokensIn, ethToUser, feeEth);
    }

    /// @notice Creator (or any holder) burns tokens they own
    function burnTokens(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        token.burnFrom(msg.sender, amount);
        // also reduce virtual token side? optional — pure supply burn is fine
        if (msg.sender == creator) {
            emit CreatorBurn(msg.sender, amount);
        }
    }

    // ─── Fees ─────────────────────────────────────────────────────────────

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
        uint256 buybackEth = feeEth - toCreator - toProtocol; // remainder = buyback share

        if (toCreator > 0) {
            (bool c,) = creator.call{value: toCreator}("");
            if (!c) revert TransferFailed();
        }
        if (toProtocol > 0) {
            (bool p,) = protocol.call{value: toProtocol}("");
            if (!p) revert TransferFailed();
        }

        if (buybackEth > 0) {
            // spend buyback ETH on curve, destroy tokens (never mint)
            tokensBoughtAndBurned =
                _getAmountOut(buybackEth, virtualEth, virtualToken);
            if (tokensBoughtAndBurned > 0 && tokensBoughtAndBurned < virtualToken)
            {
                virtualEth += buybackEth;
                virtualToken -= tokensBoughtAndBurned;
                realEth += buybackEth;
            } else {
                // can't buyback — send to protocol
                (bool p2,) = protocol.call{value: buybackEth}("");
                if (!p2) revert TransferFailed();
                buybackEth = 0;
                tokensBoughtAndBurned = 0;
            }
        }

        emit FeeDistributed(toCreator, toProtocol, buybackEth, tokensBoughtAndBurned);
    }

    receive() external payable {
        revert("use buy()");
    }
}
