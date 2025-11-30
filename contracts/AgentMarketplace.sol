// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IAuraToken is IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title AgentMarketplace
 * @dev Decentralized marketplace for trading AI-generated insights
 * Features: Insight listing, purchasing, creator payments, reputation tracking
 */
contract AgentMarketplace is Ownable, ReentrancyGuard, Pausable {
    IAuraToken public auraToken;

    // Insight structure
    struct Insight {
        uint256 insightId;
        address creator;
        string title;
        string description;
        string category;        // "LEARNING", "FINANCE", "BUSINESS", "TRENDS"
        uint256 price;          // In AURA tokens
        uint256 accessCount;    // How many users purchased
        uint256 avgRating;      // Average user rating (1-5, scaled by 100)
        uint256 createdAt;
        bool isActive;
    }

    // Purchase record
    struct Purchase {
        uint256 insightId;
        address buyer;
        uint256 price;
        uint256 timestamp;
    }

    // User reputation
    struct UserReputation {
        address user;
        uint256 insightsCreated;
        uint256 insightsPurchased;
        uint256 totalEarned;
        uint256 totalSpent;
        uint256 avgCreatorRating;   // Scaled by 100
        bool isTopCreator;
    }

    // Storage
    mapping(uint256 => Insight) public insights;
    mapping(address => UserReputation) public userReputation;
    mapping(uint256 => Purchase[]) public insightPurchases;  // insightId => purchases
    mapping(uint256 => uint256[]) public insightRatings;     // insightId => ratings (1-5, scaled)
    
    uint256 public nextInsightId = 1;
    Purchase[] public purchaseHistory;

    // Fee configuration
    uint256 public platformFeePercent = 10;  // 10% platform fee
    uint256 public totalPlatformFees;
    
    // Category statistics
    mapping(string => uint256) public categoryInsightCount;
    mapping(string => uint256) public categoryTotalVolume;

    // Events
    event InsightCreated(
        uint256 indexed insightId,
        address indexed creator,
        string title,
        string category,
        uint256 price
    );
    event InsightPurchased(
        uint256 indexed insightId,
        address indexed buyer,
        address indexed creator,
        uint256 price
    );
    event InsightRated(
        uint256 indexed insightId,
        address indexed rater,
        uint256 rating
    );
    event InsightDeactivated(uint256 indexed insightId);
    event InsightReactivated(uint256 indexed insightId);
    event CreatorPromoted(address indexed creator);
    event CreatorDemoted(address indexed creator);
    event PlatformFeeWithdrawn(uint256 amount);

    constructor(address _auraToken) {
        require(_auraToken != address(0), "Invalid AURA token address");
        auraToken = IAuraToken(_auraToken);
    }

    /**
     * @dev Create and list a new insight
     */
    function createInsight(
        string memory title,
        string memory description,
        string memory category,
        uint256 price
    ) external nonReentrant whenNotPaused {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(price > 0, "Price must be greater than 0");

        uint256 insightId = nextInsightId++;

        insights[insightId] = Insight({
            insightId: insightId,
            creator: msg.sender,
            title: title,
            description: description,
            category: category,
            price: price,
            accessCount: 0,
            avgRating: 0,
            createdAt: block.timestamp,
            isActive: true
        });

        // Update user reputation
        userReputation[msg.sender].insightsCreated++;
        categoryInsightCount[category]++;

        emit InsightCreated(insightId, msg.sender, title, category, price);
    }

    /**
     * @dev Purchase an insight
     * Transfers AURA from buyer to creator (minus platform fee)
     */
    function purchaseInsight(uint256 insightId) external nonReentrant whenNotPaused {
        Insight storage insight = insights[insightId];
        require(insight.isActive, "Insight not available");
        require(insight.creator != msg.sender, "Cannot purchase own insight");

        uint256 price = insight.price;
        require(auraToken.balanceOf(msg.sender) >= price, "Insufficient AURA balance");

        // Calculate fees
        uint256 platformFee = (price * platformFeePercent) / 100;
        uint256 creatorEarnings = price - platformFee;

        // Execute payment
        require(
            auraToken.transferFrom(msg.sender, insight.creator, creatorEarnings),
            "Payment to creator failed"
        );
        require(
            auraToken.transferFrom(msg.sender, address(this), platformFee),
            "Platform fee transfer failed"
        );

        // Update tracking
        insight.accessCount++;
        totalPlatformFees += platformFee;

        Purchase memory purchase = Purchase({
            insightId: insightId,
            buyer: msg.sender,
            price: price,
            timestamp: block.timestamp
        });

        insightPurchases[insightId].push(purchase);
        purchaseHistory.push(purchase);

        // Update reputation
        userReputation[msg.sender].insightsPurchased++;
        userReputation[msg.sender].totalSpent += price;
        userReputation[insight.creator].totalEarned += creatorEarnings;

        categoryTotalVolume[insight.category] += price;

        emit InsightPurchased(insightId, msg.sender, insight.creator, price);

        // Check for top creator status
        _updateTopCreatorStatus(insight.creator);
    }

    /**
     * @dev Rate a purchased insight (1-5 stars)
     */
    function rateInsight(uint256 insightId, uint256 rating) external {
        require(insights[insightId].isActive, "Insight does not exist");
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        
        // Verify user purchased this insight
        bool hasPurchased = false;
        Purchase[] storage purchases = insightPurchases[insightId];
        for (uint256 i = 0; i < purchases.length; i++) {
            if (purchases[i].buyer == msg.sender) {
                hasPurchased = true;
                break;
            }
        }
        require(hasPurchased, "Must purchase insight to rate it");

        // Record rating (scaled by 100)
        uint256 scaledRating = rating * 100;
        insightRatings[insightId].push(scaledRating);

        // Update average rating
        uint256 totalRating = 0;
        for (uint256 i = 0; i < insightRatings[insightId].length; i++) {
            totalRating += insightRatings[insightId][i];
        }
        insights[insightId].avgRating = totalRating / insightRatings[insightId].length;

        emit InsightRated(insightId, msg.sender, rating);

        // Update creator average rating
        _updateCreatorRating(insights[insightId].creator);
    }

    /**
     * @dev Deactivate an insight (creator only)
     */
    function deactivateInsight(uint256 insightId) external {
        Insight storage insight = insights[insightId];
        require(insight.creator == msg.sender, "Only creator can deactivate");
        require(insight.isActive, "Already deactivated");

        insight.isActive = false;
        emit InsightDeactivated(insightId);
    }

    /**
     * @dev Reactivate an insight (creator only)
     */
    function reactivateInsight(uint256 insightId) external {
        Insight storage insight = insights[insightId];
        require(insight.creator == msg.sender, "Only creator can reactivate");
        require(!insight.isActive, "Already active");

        insight.isActive = true;
        emit InsightReactivated(insightId);
    }

    /**
     * @dev Update insight price (creator only)
     */
    function updateInsightPrice(uint256 insightId, uint256 newPrice) external {
        Insight storage insight = insights[insightId];
        require(insight.creator == msg.sender, "Only creator can update price");
        require(newPrice > 0, "Price must be greater than 0");

        insight.price = newPrice;
    }

    /**
     * @dev Internal function to update top creator status
     */
    function _updateTopCreatorStatus(address creator) internal {
        UserReputation storage rep = userReputation[creator];
        
        // Criteria for top creator:
        // - At least 10 insights created
        // - At least 100 total earnings
        // - Average rating >= 4.0 (400 scaled)
        bool shouldBeTopCreator = 
            rep.insightsCreated >= 10 &&
            rep.totalEarned >= 100 * 10 ** 18 &&
            rep.avgCreatorRating >= 400;

        if (shouldBeTopCreator && !rep.isTopCreator) {
            rep.isTopCreator = true;
            emit CreatorPromoted(creator);
        } else if (!shouldBeTopCreator && rep.isTopCreator) {
            rep.isTopCreator = false;
            emit CreatorDemoted(creator);
        }
    }

    /**
     * @dev Update creator's average rating
     */
    function _updateCreatorRating(address creator) internal {
        uint256 totalRating = 0;
        uint256 insightCount = 0;

        // Calculate average across all creator's insights
        for (uint256 i = 1; i < nextInsightId; i++) {
            if (insights[i].creator == creator) {
                totalRating += insights[i].avgRating;
                insightCount++;
            }
        }

        if (insightCount > 0) {
            userReputation[creator].avgCreatorRating = totalRating / insightCount;
        }

        _updateTopCreatorStatus(creator);
    }

    /**
     * @dev Get insight details
     */
    function getInsight(uint256 insightId) external view returns (Insight memory) {
        require(insights[insightId].isActive, "Insight does not exist");
        return insights[insightId];
    }

    /**
     * @dev Get all insights by category
     */
    function getInsightsByCategory(string memory category) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextInsightId; i++) {
            if (insights[i].isActive && 
                keccak256(bytes(insights[i].category)) == keccak256(bytes(category))) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < nextInsightId; i++) {
            if (insights[i].isActive && 
                keccak256(bytes(insights[i].category)) == keccak256(bytes(category))) {
                result[index++] = i;
            }
        }
        return result;
    }

    /**
     * @dev Get user's reputation
     */
    function getUserReputation(address user) external view returns (UserReputation memory) {
        return userReputation[user];
    }

    /**
     * @dev Get purchase history for an insight
     */
    function getInsightPurchases(uint256 insightId) external view returns (Purchase[] memory) {
        return insightPurchases[insightId];
    }

    /**
     * @dev Get insight ratings
     */
    function getInsightRatings(uint256 insightId) external view returns (uint256[] memory) {
        return insightRatings[insightId];
    }

    /**
     * @dev Get total active insights
     */
    function getTotalInsights() external view returns (uint256) {
        return nextInsightId - 1;
    }

    /**
     * @dev Get platform fee percentage
     */
    function getPlatformFeePercent() external view returns (uint256) {
        return platformFeePercent;
    }

    /**
     * @dev Update platform fee percentage (owner only)
     */
    function updatePlatformFeePercent(uint256 newPercent) external onlyOwner {
        require(newPercent <= 50, "Fee cannot exceed 50%");
        platformFeePercent = newPercent;
    }

    /**
     * @dev Withdraw accumulated platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        require(totalPlatformFees > 0, "No fees to withdraw");
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        require(auraToken.transfer(msg.sender, amount), "Withdrawal failed");
        emit PlatformFeeWithdrawn(amount);
    }

    /**
     * @dev Pause marketplace
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause marketplace
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
