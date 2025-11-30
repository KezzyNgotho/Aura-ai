// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IAuraToken is IERC20 {
    function mint(address to, uint256 amount, string memory reason) external;
    function burn(uint256 amount) external;
}

interface IUSDCToken is IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title RewardsMinter
 * @dev Handles AURA token rewards minting for user activities
 * Tracks rewards for: queries, insights, contributions, referrals
 * Only authorized addresses can mint rewards
 */
contract RewardsMinter is Ownable, ReentrancyGuard, Pausable {
    IAuraToken public auraToken;
    IUSDCToken public usdc;

    // Reward amounts for different activities
    struct RewardRates {
        uint256 queryReward;           // AURA tokens for query
        uint256 insightReward;         // AURA tokens for sharing insight
        uint256 contributionReward;    // AURA tokens for AI contribution
        uint256 referralReward;        // AURA tokens for referral
        uint256 minMintAmount;         // Minimum AURA to mint
    }

    RewardRates public rewardRates = RewardRates({
        queryReward: 10 * 10 ** 18,           // 10 AURA per query
        insightReward: 50 * 10 ** 18,         // 50 AURA per shared insight
        contributionReward: 100 * 10 ** 18,   // 100 AURA per contribution
        referralReward: 25 * 10 ** 18,        // 25 AURA per referral
        minMintAmount: 1 * 10 ** 18           // Minimum 1 AURA
    });

    // User reward tracking
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public rewardsMinted;
    mapping(address => uint256) public lastMintTime;

    // Authorization
    mapping(address => bool) public authorizedMinters;

    // Events
    event RewardMinted(address indexed user, uint256 amount, string rewardType);
    event ConversionRequested(address indexed user, uint256 auraAmount, uint256 usdcAmount);
    event ConversionCompleted(address indexed user, uint256 auraAmount, uint256 usdcAmount, string transactionHash);
    event RewardRatesUpdated(uint256 queryReward, uint256 insightReward, uint256 contributionReward);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);

    constructor(address _auraToken, address _usdc) {
        require(_auraToken != address(0), "Invalid AURA token address");
        require(_usdc != address(0), "Invalid USDC address");
        
        auraToken = IAuraToken(_auraToken);
        usdc = IUSDCToken(_usdc);
        authorizedMinters[msg.sender] = true;
    }

    /**
     * @dev Authorize an address to mint rewards (typically backend/oracle)
     */
    function authorizeMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid address");
        authorizedMinters[_minter] = true;
        emit MinterAuthorized(_minter);
    }

    /**
     * @dev Revoke minter authorization
     */
    function revokeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = false;
        emit MinterRevoked(_minter);
    }

    /**
     * @dev Mint query reward
     */
    function mintQueryReward(address user) external nonReentrant whenNotPaused {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        
        uint256 amount = rewardRates.queryReward;
        _mintReward(user, amount, "query");
    }

    /**
     * @dev Mint insight sharing reward
     */
    function mintInsightReward(address user) external nonReentrant whenNotPaused {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        
        uint256 amount = rewardRates.insightReward;
        _mintReward(user, amount, "insight");
    }

    /**
     * @dev Mint AI contribution reward
     */
    function mintContributionReward(address user) external nonReentrant whenNotPaused {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        
        uint256 amount = rewardRates.contributionReward;
        _mintReward(user, amount, "contribution");
    }

    /**
     * @dev Mint referral reward
     */
    function mintReferralReward(address user) external nonReentrant whenNotPaused {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        
        uint256 amount = rewardRates.referralReward;
        _mintReward(user, amount, "referral");
    }

    /**
     * @dev Internal function to mint rewards
     */
    function _mintReward(address user, uint256 amount, string memory rewardType) internal {
        require(amount >= rewardRates.minMintAmount, "Amount below minimum");
        
        auraToken.mint(user, amount, rewardType);
        totalRewardsEarned[user] += amount;
        rewardsMinted[user] += amount;
        lastMintTime[user] = block.timestamp;
        
        emit RewardMinted(user, amount, rewardType);
    }

    /**
     * @dev Update reward rates (owner only)
     */
    function updateRewardRates(
        uint256 _queryReward,
        uint256 _insightReward,
        uint256 _contributionReward,
        uint256 _referralReward
    ) external onlyOwner {
        rewardRates.queryReward = _queryReward;
        rewardRates.insightReward = _insightReward;
        rewardRates.contributionReward = _contributionReward;
        rewardRates.referralReward = _referralReward;
        
        emit RewardRatesUpdated(_queryReward, _insightReward, _contributionReward);
    }

    /**
     * @dev Get user's total rewards earned
     */
    function getUserRewards(address user) external view returns (uint256) {
        return totalRewardsEarned[user];
    }

    /**
     * @dev Pause minting in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause minting
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Check if address is authorized minter
     */
    function isMinterAuthorized(address _minter) external view returns (bool) {
        return authorizedMinters[_minter];
    }
}
