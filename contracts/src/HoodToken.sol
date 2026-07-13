// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HoodToken — fixed-supply ERC-20 minted once to the launcher
contract HoodToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    uint256 public immutable maxSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public immutable launcher;
    address public immutable creator;
    bool public initialMintDone;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error OnlyLauncher();
    error InsufficientBalance();
    error InsufficientAllowance();
    error AlreadyMinted();
    error CapExceeded();

    modifier onlyLauncher() {
        if (msg.sender != launcher) revert OnlyLauncher();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address creator_
    ) {
        require(maxSupply_ > 0, "supply");
        name = name_;
        symbol = symbol_;
        maxSupply = maxSupply_;
        launcher = msg.sender;
        creator = creator_;
    }

    function mintInitial(uint256 amount) external onlyLauncher {
        if (initialMintDone) revert AlreadyMinted();
        if (amount > maxSupply) revert CapExceeded();
        initialMintDone = true;
        totalSupply = amount;
        balanceOf[msg.sender] = amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Launcher/market may burn from any address (inventory burns)
    function burnFrom(address from, uint256 amount) external onlyLauncher {
        _burn(from, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }
}
