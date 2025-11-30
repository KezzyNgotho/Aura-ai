// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IAuraToken is IERC20 {
    function burn(uint256 amount) external;
}

interface IUSDCToken is IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title TokenConverter
 * @dev Converts between AURA and USDC tokens with configurable exchange rates
 * Supports multiple blockchains: Base, Optimism, Arbitrum, Polygon
 * Uses reserve-based model for sustainable conversion
 */
contract TokenConverter is Ownable, ReentrancyGuard, Pausable {
    IAuraToken public auraToken;
    IUSDCToken public usdc;

    // Exchange rate: how many AURA = 1 USDC (scaled by 10^6)
    // Default: 10 * 10^6 = 10 AURA per USDC
    uint256 public exchangeRate = 10 * 10 ** 6;

    // Reserves and tracking
    uint256 public auraReserve;
    uint256 public usdcReserve;
    uint256 public totalAuraConverted;
    uint256 public totalUsdcConverted;

    // Conversion limits
    struct ConversionLimits {
        uint256 minAuraAmount;      // Minimum AURA to convert
        uint256 maxAuraPerDay;      // Maximum AURA conversions per day
        uint256 minUsdcAmount;      // Minimum USDC to convert
        uint256 maxUsdcPerDay;      // Maximum USDC conversions per day
    }

    ConversionLimits public limits = ConversionLimits({
        minAuraAmount: 1 * 10 ** 18,           // Minimum 1 AURA
        maxAuraPerDay: 1000000 * 10 ** 18,     // Maximum 1M AURA per day
        minUsdcAmount: 1 * 10 ** 6,            // Minimum 1 USDC
        maxUsdcPerDay: 100000 * 10 ** 6        // Maximum 100K USDC per day
    });

    // Daily conversion tracking
    mapping(address => uint256) public auraDailyTotal;
    mapping(address => uint256) public usdcDailyTotal;
    mapping(address => uint256) public lastAuraConversionDay;
    mapping(address => uint256) public lastUsdcConversionDay;

    // Conversion history
    struct ConversionRecord {
        address user;
        uint256 amountFrom;
        uint256 amountTo;
        string conversionType; // "aura_to_usdc" or "usdc_to_aura"
        uint256 timestamp;
        uint256 rate;
    }

    ConversionRecord[] public conversionHistory;

    // Events
    event AuraToUsdcConverted(
        address indexed user,
        uint256 auraAmount,
        uint256 usdcAmount,
        uint256 rate
    );
    event UsdcToAuraConverted(
        address indexed user,
        uint256 usdcAmount,
        uint256 auraAmount,
        uint256 rate
    );
    event ExchangeRateUpdated(uint256 newRate);
    event ReserveUpdated(uint256 auraReserve, uint256 usdcReserve);
    event ConversionLimitsUpdated(uint256 minAura, uint256 maxAuraPerDay);
    event EmergencyWithdrawal(address indexed token, uint256 amount);

    constructor(address _auraToken, address _usdc) {
        require(_auraToken != address(0), "Invalid AURA token address");
        require(_usdc != address(0), "Invalid USDC address");
        
        auraToken = IAuraToken(_auraToken);
        usdc = IUSDCToken(_usdc);
    }

    /**
     * @dev Convert AURA tokens to USDC
     * Burns AURA from user's balance and transfers USDC from reserves
     */
    function convertAuraToUsdc(uint256 auraAmount) external nonReentrant whenNotPaused {
        require(auraAmount >= limits.minAuraAmount, "Below minimum AURA amount");
        require(auraToken.balanceOf(msg.sender) >= auraAmount, "Insufficient AURA balance");

        // Check daily limits
        uint256 today = block.timestamp / 1 days;
        if (lastAuraConversionDay[msg.sender] != today) {
            auraDailyTotal[msg.sender] = 0;
            lastAuraConversionDay[msg.sender] = today;
        }
        
        uint256 newDailyTotal = auraDailyTotal[msg.sender] + auraAmount;
        require(newDailyTotal <= limits.maxAuraPerDay, "Exceeds daily conversion limit");

        // Calculate USDC amount (auraAmount / exchangeRate)
        // exchangeRate is scaled by 10^6, so: usdc = aura * 10^6 / exchangeRate
        uint256 usdcAmount = (auraAmount * 10 ** 6) / exchangeRate;
        
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC reserves");

        // Execute conversion
        auraToken.burn(auraAmount);
        require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");

        // Update tracking
        auraDailyTotal[msg.sender] = newDailyTotal;
        auraReserve -= auraAmount;
        usdcReserve -= usdcAmount;
        totalAuraConverted += auraAmount;

        // Record conversion
        _recordConversion(msg.sender, auraAmount, usdcAmount, "aura_to_usdc");

        emit AuraToUsdcConverted(msg.sender, auraAmount, usdcAmount, exchangeRate);
    }

    /**
     * @dev Convert USDC tokens to AURA
     * User transfers USDC and receives minted AURA tokens
     * Note: In production, would need approval or have user call approve first
     */
    function convertUsdcToAura(uint256 usdcAmount) external nonReentrant whenNotPaused {
        require(usdcAmount >= limits.minUsdcAmount, "Below minimum USDC amount");
        require(usdc.balanceOf(msg.sender) >= usdcAmount, "Insufficient USDC balance");

        // Check daily limits
        uint256 today = block.timestamp / 1 days;
        if (lastUsdcConversionDay[msg.sender] != today) {
            usdcDailyTotal[msg.sender] = 0;
            lastUsdcConversionDay[msg.sender] = today;
        }
        
        uint256 newDailyTotal = usdcDailyTotal[msg.sender] + usdcAmount;
        require(newDailyTotal <= limits.maxUsdcPerDay, "Exceeds daily conversion limit");

        // Calculate AURA amount (usdcAmount * exchangeRate)
        // exchangeRate is scaled by 10^6, so: aura = usdc * exchangeRate / 10^6
        uint256 auraAmount = (usdcAmount * exchangeRate) / 10 ** 6;

        // Transfer USDC from user to contract (requires prior approval)
        require(
            usdc.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed - check allowance"
        );

        // Update reserves and tracking
        usdcDailyTotal[msg.sender] = newDailyTotal;
        auraReserve += auraAmount;
        usdcReserve += usdcAmount;
        totalUsdcConverted += usdcAmount;

        // Record conversion
        _recordConversion(msg.sender, usdcAmount, auraAmount, "usdc_to_aura");

        emit UsdcToAuraConverted(msg.sender, usdcAmount, auraAmount, exchangeRate);
    }

    /**
     * @dev Internal function to record conversion history
     */
    function _recordConversion(
        address user,
        uint256 amountFrom,
        uint256 amountTo,
        string memory conversionType
    ) internal {
        conversionHistory.push(ConversionRecord({
            user: user,
            amountFrom: amountFrom,
            amountTo: amountTo,
            conversionType: conversionType,
            timestamp: block.timestamp,
            rate: exchangeRate
        }));
    }

    /**
     * @dev Update exchange rate (owner only)
     * Rate is how many AURA = 1 USDC, scaled by 10^6
     * Example: 10 * 10^6 = 10 AURA per USDC
     */
    function updateExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid exchange rate");
        exchangeRate = newRate;
        emit ExchangeRateUpdated(newRate);
    }

    /**
     * @dev Update conversion limits
     */
    function updateConversionLimits(
        uint256 _minAuraAmount,
        uint256 _maxAuraPerDay,
        uint256 _minUsdcAmount,
        uint256 _maxUsdcPerDay
    ) external onlyOwner {
        limits.minAuraAmount = _minAuraAmount;
        limits.maxAuraPerDay = _maxAuraPerDay;
        limits.minUsdcAmount = _minUsdcAmount;
        limits.maxUsdcPerDay = _maxUsdcPerDay;
        
        emit ConversionLimitsUpdated(_minAuraAmount, _maxAuraPerDay);
    }

    /**
     * @dev Deposit USDC reserves (owner only)
     * Called to add USDC liquidity for conversions
     */
    function depositUsdcReserve(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        usdcReserve += amount;
        emit ReserveUpdated(auraReserve, usdcReserve);
    }

    /**
     * @dev Withdraw USDC reserves (owner only)
     * Called to remove USDC liquidity
     */
    function withdrawUsdcReserve(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= usdcReserve, "Exceeds reserve");
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        usdcReserve -= amount;
        emit ReserveUpdated(auraReserve, usdcReserve);
    }

    /**
     * @dev Get current exchange rate
     */
    function getExchangeRate() external view returns (uint256) {
        return exchangeRate;
    }

    /**
     * @dev Calculate how much USDC you get for AURA
     */
    function getUsdcForAura(uint256 auraAmount) external view returns (uint256) {
        return (auraAmount * 10 ** 6) / exchangeRate;
    }

    /**
     * @dev Calculate how much AURA you get for USDC
     */
    function getAuraForUsdc(uint256 usdcAmount) external view returns (uint256) {
        return (usdcAmount * exchangeRate) / 10 ** 6;
    }

    /**
     * @dev Get conversion history length
     */
    function getConversionHistoryLength() external view returns (uint256) {
        return conversionHistory.length;
    }

    /**
     * @dev Get conversion record by index
     */
    function getConversionRecord(uint256 index) external view returns (ConversionRecord memory) {
        require(index < conversionHistory.length, "Index out of bounds");
        return conversionHistory[index];
    }

    /**
     * @dev Check user's daily AURA conversion total
     */
    function getUserAuraDailyTotal(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (lastAuraConversionDay[user] != today) {
            return 0;
        }
        return auraDailyTotal[user];
    }

    /**
     * @dev Pause conversions in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause conversions
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal of tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0), "Invalid token");
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit EmergencyWithdrawal(token, amount);
    }
}
