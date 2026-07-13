// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {INonfungiblePositionManagerMinimal, IWETH9Minimal} from "./interfaces/IUniswapV3.sol";

/// @title HoodV3Locker
/// @notice Holds every V3 launch's position NFT forever. Principal liquidity is
///         non-withdrawable — only fee collection is exposed. Creator/protocol
///         share is snapshotted per position at launch.
contract HoodV3Locker is ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    INonfungiblePositionManagerMinimal public immutable POSITION_MANAGER;
    address public immutable PROTOCOL_TREASURY;
    address public immutable FACTORY;

    struct PositionMeta {
        address creator;
        address meme;
        address pairToken;
        uint16 creatorShareBps;
    }

    uint16 public defaultCreatorShareBps;

    mapping(uint256 tokenId => PositionMeta) public positionMeta;
    mapping(address meme => uint256) public positionOf;
    mapping(uint256 tokenId => address) public rewardRecipientOverride;

    error OnlyPositionManager();
    error OnlyFactory();
    error OnlyAdmin();
    error AlreadyRegistered();
    error UnknownPosition();
    error InvalidShare();
    error UnexpectedETH();

    event Registered(
        uint256 indexed tokenId, address indexed creator, address indexed meme, uint16 creatorShareBps
    );
    event DefaultCreatorShareUpdated(uint16 creatorShareBps);
    event RewardRecipientChanged(uint256 indexed tokenId, address indexed meme, address indexed newRecipient);
    event FeesCollected(
        uint256 indexed tokenId,
        address indexed meme,
        uint256 totalEth,
        uint256 totalMeme,
        uint256 creatorEth,
        uint256 creatorMeme
    );

    constructor(
        INonfungiblePositionManagerMinimal positionManager_,
        address treasury_,
        address factory_,
        uint16 initialCreatorShareBps_
    ) {
        if (initialCreatorShareBps_ > 10_000) revert InvalidShare();
        POSITION_MANAGER = positionManager_;
        PROTOCOL_TREASURY = treasury_;
        FACTORY = factory_;
        defaultCreatorShareBps = initialCreatorShareBps_;
    }

    function setDefaultCreatorShareBps(uint16 newShareBps) external {
        if (msg.sender != Ownable(FACTORY).owner()) revert OnlyAdmin();
        if (newShareBps > 10_000) revert InvalidShare();
        defaultCreatorShareBps = newShareBps;
        emit DefaultCreatorShareUpdated(newShareBps);
    }

    function register(uint256 tokenId, address creator, address meme, address pairToken) external {
        if (msg.sender != FACTORY) revert OnlyFactory();
        if (positionMeta[tokenId].creator != address(0)) revert AlreadyRegistered();
        uint16 share = defaultCreatorShareBps;
        positionMeta[tokenId] = PositionMeta(creator, meme, pairToken, share);
        positionOf[meme] = tokenId;
        emit Registered(tokenId, creator, meme, share);
    }

    function setRewardRecipient(uint256 tokenId, address newRecipient) external {
        if (msg.sender != Ownable(FACTORY).owner()) revert OnlyAdmin();
        PositionMeta memory pm = positionMeta[tokenId];
        if (pm.creator == address(0)) revert UnknownPosition();
        rewardRecipientOverride[tokenId] = newRecipient;
        emit RewardRecipientChanged(
            tokenId, pm.meme, newRecipient == address(0) ? pm.creator : newRecipient
        );
    }

    function rewardRecipient(uint256 tokenId) public view returns (address) {
        address r = rewardRecipientOverride[tokenId];
        return r == address(0) ? positionMeta[tokenId].creator : r;
    }

    function collect(uint256 tokenId) external nonReentrant {
        _collect(tokenId);
    }

    function collectMany(uint256[] calldata tokenIds) external nonReentrant {
        uint256 len = tokenIds.length;
        for (uint256 i; i < len; ++i) {
            _collect(tokenIds[i]);
        }
    }

    function _collect(uint256 tokenId) internal {
        PositionMeta memory pm = positionMeta[tokenId];
        if (pm.creator == address(0)) revert UnknownPosition();

        (uint256 amount0, uint256 amount1) = POSITION_MANAGER.collect(
            INonfungiblePositionManagerMinimal.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        (uint256 pairAmount, uint256 memeAmount) =
            pm.pairToken < pm.meme ? (amount0, amount1) : (amount1, amount0);

        if (pairAmount > 0) {
            IWETH9Minimal(pm.pairToken).withdraw(pairAmount);
        }

        address recipient = rewardRecipient(tokenId);

        uint256 creatorEth = (pairAmount * pm.creatorShareBps) / 10_000;
        uint256 creatorMeme = (memeAmount * pm.creatorShareBps) / 10_000;
        uint256 protoEth = pairAmount - creatorEth;
        uint256 protoMeme = memeAmount - creatorMeme;

        if (creatorEth > 0) {
            (bool ok,) = recipient.call{value: creatorEth}("");
            if (!ok) protoEth += creatorEth;
        }
        if (creatorMeme > 0) {
            IERC20(pm.meme).safeTransfer(recipient, creatorMeme);
        }

        if (protoEth > 0) {
            (bool ok,) = PROTOCOL_TREASURY.call{value: protoEth}("");
            require(ok, "treasury ETH send failed");
        }
        if (protoMeme > 0) {
            IERC20(pm.meme).safeTransfer(PROTOCOL_TREASURY, protoMeme);
        }

        emit FeesCollected(tokenId, pm.meme, pairAmount, memeAmount, creatorEth, creatorMeme);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        view
        override
        returns (bytes4)
    {
        if (msg.sender != address(POSITION_MANAGER)) revert OnlyPositionManager();
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {
        if (msg.sender.code.length == 0) revert UnexpectedETH();
    }
}
