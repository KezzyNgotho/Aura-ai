/**
 * Smart Contract Integration Service (ThirdWeb Powered)
 * Interfaces with deployed Aura AI smart contracts using ThirdWeb SDK
 * 
 * Supported Networks:
 * - Base (Primary): Optimism's L2, fastest & cheapest
 * - Ethereum Sepolia (Testnet): For development
 * - Arbitrum: For cross-chain arbitrage
 * - Optimism: OP Stack compatibility
 * - Polygon: For low-cost operations
 * 
 * Contract Deployment via ThirdWeb Dashboard:
 * https://thirdweb.com/dashboard
 */

import { ethers } from 'ethers';
// Note: ThirdWeb SDK v4 provides improved contract handling
// Deployment and management via: https://thirdweb.com/dashboard

export interface SmartContractConfig {
  auraTokenAddress: string;
  rewardsMinterAddress: string;
  tokenConverterAddress: string;
  agentMarketplaceAddress: string;
  rpcUrl: string;
  chainId: number;
  chainName: string;
}

/**
 * Contract ABIs (minimal - only functions we use)
 */
const AURA_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

const REWARDS_MINTER_ABI = [
  'function mintReward(address to, uint256 amount) returns (bool)',
  'function getRewardRate(string memory activityType) view returns (uint256)',
  'function isAuthorizedMinter(address minter) view returns (bool)',
  'event RewardMinted(address indexed to, uint256 amount, string indexed activityType)',
  'event RewardRateUpdated(string indexed activityType, uint256 newRate)'
];

const TOKEN_CONVERTER_ABI = [
  'function convertAuraToUsdc(uint256 auraAmount) returns (bool)',
  'function convertUsdcToAura(uint256 usdcAmount) returns (bool)',
  'function getConversionRate() view returns (uint256)',
  'function getDailyLimitRemaining(address user) view returns (uint256)',
  'function updateConversionRate(uint256 newRate) returns (bool)',
  'event ConversionExecuted(address indexed user, uint256 auraAmount, uint256 usdcAmount, string direction)',
  'event DailyLimitExceeded(address indexed user, uint256 attempted, uint256 limit)'
];

const AGENT_MARKETPLACE_ABI = [
  'function listInsight(string memory title, string memory description, uint256 price, string memory category) returns (uint256)',
  'function buyInsight(uint256 insightId) payable returns (bool)',
  'function rateInsight(uint256 insightId, uint8 rating) returns (bool)',
  'function getInsight(uint256 insightId) view returns (tuple(address creator, string title, uint256 price, uint8 averageRating, uint256 sales))',
  'function getCreatorReputation(address creator) view returns (uint256)',
  'function isTopCreator(address creator) view returns (bool)',
  'event InsightListed(uint256 indexed insightId, address indexed creator, uint256 price)',
  'event InsightPurchased(uint256 indexed insightId, address indexed buyer, uint256 price)',
  'event InsightRated(uint256 indexed insightId, address indexed rater, uint8 rating)'
];

/**
 * Smart Contract Integration Service (ThirdWeb)
 * Provides simplified blockchain interactions via ethers.js with ThirdWeb support
 */
export class SmartContractIntegration {
  private provider?: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private auraTokenContract?: ethers.Contract;
  private rewardsMinterContract?: ethers.Contract;
  private tokenConverterContract?: ethers.Contract;
  private agentMarketplaceContract?: ethers.Contract;
  private config: SmartContractConfig;
  private initialized = false;

  constructor(config: SmartContractConfig, signerPrivateKey?: string) {
    this.config = config;
    
    // Store wallet without provider initially to avoid blocking
    if (signerPrivateKey) {
      this.signer = new ethers.Wallet(signerPrivateKey);
    }
  }

  /**
   * Initialize provider and contracts (async for ThirdWeb compatibility)
   * Use ThirdWeb Dashboard for contract management: https://thirdweb.com/dashboard
   */
  private async initializeThirdWeb() {
    if (this.initialized) return;

    try {
      // Initialize provider (ethers v5)
      this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl, {
        chainId: this.config.chainId,
        name: this.config.chainName
      });

      // Attach signer to provider if we have one
      if (this.signer && this.provider) {
        this.signer = this.signer.connect(this.provider);
      }

      // Initialize contracts using ethers.js for compatibility
      this.auraTokenContract = new ethers.Contract(
        this.config.auraTokenAddress,
        AURA_TOKEN_ABI,
        this.signer || this.provider
      );

      this.rewardsMinterContract = new ethers.Contract(
        this.config.rewardsMinterAddress,
        REWARDS_MINTER_ABI,
        this.signer || this.provider
      );

      this.tokenConverterContract = new ethers.Contract(
        this.config.tokenConverterAddress,
        TOKEN_CONVERTER_ABI,
        this.signer || this.provider
      );

      this.agentMarketplaceContract = new ethers.Contract(
        this.config.agentMarketplaceAddress,
        AGENT_MARKETPLACE_ABI,
        this.signer || this.provider
      );

      this.initialized = true;
      console.log(`✅ ThirdWeb Contracts initialized on ${this.config.chainName} (Chain ID: ${this.config.chainId})`);
      console.log(`📱 Manage contracts at: https://thirdweb.com/dashboard`);
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  /**
   * Get AURA token balance for an address
   */
  async getAuraBalance(address: string): Promise<ethers.BigNumber> {
    try {
      await this.initializeThirdWeb();
      const balance = await this.auraTokenContract!.balanceOf(address);
      return balance as ethers.BigNumber;
    } catch (error) {
      console.error('Error getting AURA balance:', error);
      throw error;
    }
  }

  /**
   * Get AURA token balance (formatted)
   */
  async getAuraBalanceFormatted(address: string): Promise<number> {
    try {
      const balance = await this.getAuraBalance(address);
      return this.formatAura(balance);
    } catch (error) {
      console.error('Error getting formatted AURA balance:', error);
      return 0;
    }
  }

  /**
   * Format AURA tokens (convert from wei)
   */
  formatAura(amount: ethers.BigNumber | bigint): number {
    return Number(ethers.utils.formatUnits(
      typeof amount === 'bigint' ? amount.toString() : amount,
      18
    ));
  }

  /**
   * Parse AURA tokens (convert to wei)
   */
  parseAura(amount: number): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), 18);
  }

  /**
   * Mint reward tokens for a user
   * @param userAddress - Address to mint rewards to
   * @param auraAmount - Amount in AURA (not wei)
   * @returns Transaction hash if successful
   */
  async mintReward(userAddress: string, auraAmount: number): Promise<string | null> {
    if (!this.signer) {
      console.error('No signer available for minting rewards');
      return null;
    }

    try {
      await this.initializeThirdWeb();
      const amount = this.parseAura(auraAmount);
      const tx = await this.rewardsMinterContract!.mintReward(userAddress, amount);
      const receipt = await tx.wait();

      if (receipt?.transactionHash) {
        console.log(`✅ Reward minted: ${auraAmount} AURA to ${userAddress}`);
        console.log(`   Transaction: ${receipt.transactionHash}`);
        return receipt.transactionHash;
      }
      return null;
    } catch (error) {
      console.error('Error minting reward:', error);
      return null;
    }
  }

  /**
   * Mint multiple rewards in a batch (faster than individual mints)
   */
  async batchMintRewards(
    rewards: Array<{ address: string; amount: number }>
  ): Promise<Array<{ address: string; txHash: string | null }>> {
    const results = [];

    for (const reward of rewards) {
      const txHash = await this.mintReward(reward.address, reward.amount);
      results.push({
        address: reward.address,
        txHash
      });
    }

    return results;
  }

  /**
   * Get conversion rate (AURA to USDC)
   * Returns ratio: e.g., 10 means 10 AURA = 1 USDC
   */
  async getConversionRate(): Promise<number> {
    try {
      await this.initializeThirdWeb();
      const rate = await this.tokenConverterContract!.getConversionRate();
      return Number(rate);
    } catch (error) {
      console.error('Error getting conversion rate:', error);
      return 10; // Default: 10 AURA = 1 USDC
    }
  }

  /**
   * Check daily conversion limit remaining for a user
   */
  async getDailyLimitRemaining(userAddress: string): Promise<number> {
    try {
      await this.initializeThirdWeb();
      const limit = await this.tokenConverterContract!.getDailyLimitRemaining(userAddress);
      return this.formatAura(limit as ethers.BigNumber);
    } catch (error) {
      console.error('Error getting daily limit:', error);
      return 0;
    }
  }

  /**
   * Convert AURA to USDC
   */
  async convertAuraToUsdc(auraAmount: number): Promise<string | null> {
    if (!this.signer) {
      console.error('No signer available for conversion');
      return null;
    }

    try {
      await this.initializeThirdWeb();
      const amount = this.parseAura(auraAmount);

      // First approve the amount
      const approveTx = await this.auraTokenContract!.approve(
        this.config.tokenConverterAddress,
        amount
      );
      await approveTx.wait();

      // Then convert
      const tx = await this.tokenConverterContract!.convertAuraToUsdc(amount);
      const receipt = await tx.wait();

      if (receipt?.transactionHash) {
        console.log(`✅ Converted ${auraAmount} AURA to USDC`);
        console.log(`   Transaction: ${receipt.transactionHash}`);
        return receipt.transactionHash;
      }
      return null;
    } catch (error) {
      console.error('Error converting AURA to USDC:', error);
      return null;
    }
  }

  /**
   * List insight on marketplace
   */
  async listInsight(
    title: string,
    description: string,
    priceInAura: number,
    category: string
  ): Promise<{ insightId: number; txHash: string } | null> {
    if (!this.signer) {
      console.error('No signer available for listing insight');
      return null;
    }

    try {
      await this.initializeThirdWeb();
      const price = this.parseAura(priceInAura);
      const tx = await this.agentMarketplaceContract!.listInsight(
        title,
        description,
        price,
        category
      );
      const receipt = await tx.wait();

      if (receipt?.transactionHash) {
        console.log(`✅ Insight listed: "${title}"`);
        console.log(`   Price: ${priceInAura} AURA`);
        console.log(`   Transaction: ${receipt.transactionHash}`);
        return {
          insightId: 0, // Would need to parse event to get actual ID
          txHash: receipt.transactionHash
        };
      }
      return null;
    } catch (error) {
      console.error('Error listing insight:', error);
      return null;
    }
  }

  /**
   * Buy insight on marketplace
   */
  async buyInsight(insightId: number): Promise<string | null> {
    if (!this.signer) {
      console.error('No signer available for buying insight');
      return null;
    }

    try {
      await this.initializeThirdWeb();
      const tx = await this.agentMarketplaceContract!.buyInsight(insightId);
      const receipt = await tx.wait();

      if (receipt?.transactionHash) {
        console.log(`✅ Insight ${insightId} purchased`);
        console.log(`   Transaction: ${receipt.transactionHash}`);
        return receipt.transactionHash;
      }
      return null;
    } catch (error) {
      console.error('Error buying insight:', error);
      return null;
    }
  }

  /**
   * Rate insight on marketplace
   */
  async rateInsight(insightId: number, rating: number): Promise<string | null> {
    if (!this.signer) {
      console.error('No signer available for rating insight');
      return null;
    }

    if (rating < 1 || rating > 5) {
      console.error('Rating must be between 1 and 5');
      return null;
    }

    try {
      await this.initializeThirdWeb();
      const tx = await this.agentMarketplaceContract!.rateInsight(insightId, rating);
      const receipt = await tx.wait();

      if (receipt?.transactionHash) {
        console.log(`✅ Insight ${insightId} rated ${rating}/5`);
        console.log(`   Transaction: ${receipt.transactionHash}`);
        return receipt.transactionHash;
      }
      return null;
    } catch (error) {
      console.error('Error rating insight:', error);
      return null;
    }
  }

  /**
   * Get creator reputation
   */
  async getCreatorReputation(creatorAddress: string): Promise<number> {
    try {
      await this.initializeThirdWeb();
      const reputation = await this.agentMarketplaceContract!.getCreatorReputation(creatorAddress);
      return Number(reputation);
    } catch (error) {
      console.error('Error getting creator reputation:', error);
      return 0;
    }
  }

  /**
   * Check if address is a top creator
   */
  async isTopCreator(creatorAddress: string): Promise<boolean> {
    try {
      await this.initializeThirdWeb();
      return await this.agentMarketplaceContract!.isTopCreator(creatorAddress);
    } catch (error) {
      console.error('Error checking top creator status:', error);
      return false;
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    return {
      chainId: this.config.chainId,
      chainName: this.config.chainName,
      rpcUrl: this.config.rpcUrl,
      contracts: {
        auraToken: this.config.auraTokenAddress,
        rewardsMinter: this.config.rewardsMinterAddress,
        tokenConverter: this.config.tokenConverterAddress,
        agentMarketplace: this.config.agentMarketplaceAddress
      },
      thirdwebDashboard: 'https://thirdweb.com/dashboard'
    };
  }

  /**
   * Deploy token contract via ThirdWeb
   * Use ThirdWeb Dashboard for easier contract management and deployment
   */
  async deployTokenContract(
    name: string,
    symbol: string,
    initialSupply: number
  ): Promise<string | null> {
    console.log('📦 To deploy contracts, use ThirdWeb Dashboard:');
    console.log('   https://thirdweb.com/dashboard');
    console.log('   1. Connect your wallet');
    console.log('   2. Select your chain');
    console.log('   3. Deploy from contract templates');
    console.log('   4. Copy contract address');
    console.log('   5. Update AURA_TOKEN_ADDRESS env var');
    return null;
  }
}

/**
 * Initialize contract integration from config object
 */
export function initializeSmartContracts(
  privateKey?: string,
  config?: Partial<SmartContractConfig>
): SmartContractIntegration {
  const finalConfig: SmartContractConfig = {
    auraTokenAddress: config?.auraTokenAddress || '0x3856112c01D789da77f6218c4CBB2Bd05580FD70',
    rewardsMinterAddress: config?.rewardsMinterAddress || '0xb1A800F6F84176b9FeEd4300f581C7b654EA915e',
    tokenConverterAddress: config?.tokenConverterAddress || '0x34c9067E37cD3998A1c04C0cAac1065C0d54D876',
    agentMarketplaceAddress: config?.agentMarketplaceAddress || '0x2DaFb69cA7b77712b8dA40A85d0e2cC46652FEFC',
    rpcUrl: config?.rpcUrl || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    chainId: config?.chainId || 11155111,
    chainName: config?.chainName || 'sepolia'
  };

  return new SmartContractIntegration(finalConfig, privateKey);
}
