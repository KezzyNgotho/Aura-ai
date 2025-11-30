// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title AuraToken
 * @dev AURA is the native token for the Aura AI platform
 * Users earn AURA tokens for generating insights and contributions
 * Can be converted to USDC on supported blockchains (Base, Optimism, Arbitrum, Polygon)
 */
contract AuraToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    // Minting role - controlled by RewardsMinter contract
    mapping(address => bool) public minters;
    
    // Maximum supply cap (100 million tokens)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount);

    constructor() ERC20("Aura Token", "AURA") ERC20Permit("Aura Token") {
        // Initial mint for liquidity and rewards pool (10 million)
        _mint(owner(), 10_000_000 * 10 ** 18);
    }

    /**
     * @dev Add a minter address (typically the RewardsMinter contract)
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }

    /**
     * @dev Remove a minter address
     */
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }

    /**
     * @dev Mint tokens (only callable by authorized minters)
     */
    function mint(address to, uint256 amount, string memory reason) external {
        require(minters[msg.sender], "Only minters can mint");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        require(to != address(0), "Invalid recipient");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Burn tokens from caller
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from specific address (requires approval)
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Get total supply with 18 decimals
     */
    function decimals() public view override returns (uint8) {
        return 18;
    }
}
