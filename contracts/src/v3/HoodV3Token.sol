// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title HoodV3Token
/// @notice EIP-1167 clone per V3-direct launch. Full supply minted to factory at
///         init and placed single-sided into a Uniswap V3 pool in the same tx.
///
///         Anti-snipe: after factory activateLimits() (end of launch, AFTER the
///         creator initial buy), maxWallet/maxTx apply until restrictionEndBlock.
///         Pool, factory, and locker are exempt.
contract HoodV3Token is ERC20 {
    address public factory;
    address public deployer;
    address public liquidityPool;

    string private _tokenName;
    string private _tokenSymbol;
    string public metadataURI;

    uint256 public launchBlock;
    uint256 public restrictionEndBlock;
    uint256 public maxWalletAmount; // 0 = no cap
    uint256 public maxTxAmount; // 0 = no cap
    bool public limitsActivated;

    mapping(address => bool) public exemptFromLimits;

    error AlreadyInitialized();
    error NotFactory();
    error MaxWalletExceeded();
    error MaxTxExceeded();

    constructor() ERC20("", "") {
        // Lock implementation so it cannot be grief-initialized.
        factory = address(0xdead);
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata metadataURI_,
        address deployer_,
        address locker_,
        uint256 totalSupply_,
        uint16 maxWalletBps_,
        uint16 maxTxBps_,
        uint32 restrictionBlocks_
    ) external {
        if (factory != address(0)) revert AlreadyInitialized();
        factory = msg.sender;
        deployer = deployer_;
        _tokenName = name_;
        _tokenSymbol = symbol_;
        metadataURI = metadataURI_;

        launchBlock = block.number;
        restrictionEndBlock = block.number + restrictionBlocks_;
        if (maxWalletBps_ != 0 && maxWalletBps_ < 10_000) {
            maxWalletAmount = (totalSupply_ * maxWalletBps_) / 10_000;
        }
        if (maxTxBps_ != 0 && maxTxBps_ < 10_000) {
            maxTxAmount = (totalSupply_ * maxTxBps_) / 10_000;
        }

        exemptFromLimits[msg.sender] = true;
        exemptFromLimits[locker_] = true;

        _mint(msg.sender, totalSupply_);
    }

    function setPool(address pool_) external {
        if (msg.sender != factory) revert NotFactory();
        if (liquidityPool != address(0)) revert AlreadyInitialized();
        liquidityPool = pool_;
    }

    /// @notice Called by factory at end of launch, after creator initial buy.
    function activateLimits() external {
        if (msg.sender != factory) revert NotFactory();
        limitsActivated = true;
    }

    function restrictionsActive() public view returns (bool) {
        return limitsActivated && block.number < restrictionEndBlock;
    }

    function name() public view override returns (string memory) {
        return _tokenName;
    }

    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (restrictionsActive()) {
            bool fromExempt = exemptFromLimits[from] || from == liquidityPool;
            bool toExempt = exemptFromLimits[to] || to == liquidityPool;
            if (maxTxAmount != 0 && !(fromExempt && toExempt)) {
                if (value > maxTxAmount) revert MaxTxExceeded();
            }
            if (maxWalletAmount != 0 && !toExempt && to != address(0)) {
                if (balanceOf(to) + value > maxWalletAmount) revert MaxWalletExceeded();
            }
        }
        super._update(from, to, value);
    }
}
