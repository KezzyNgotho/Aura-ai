/**
 * Crypto Rewards Service
 * Handles conversion of Aura tokens to real-world crypto (USDC) on multiple blockchains
 * Primary: Base Chain (Optimism L2) - Fast, cheap, Ethereum-compatible
 * Secondary: Optimism, Arbitrum, Polygon
 * Optional (Testnet): ThirdWeb Testnet - Development and testing
 * 
 * USDC Contract Addresses:
 * - Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * - Optimism: 0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85
 * - Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 * - Polygon: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
 * - ThirdWeb Testnet: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (test USDC)
 */

export interface CryptoReward {
  id: string;
  userId: string;
  auraTokens: number;
  usdcAmount: number;
  blockchain: 'base' | 'optimism' | 'arbitrum' | 'polygon' | 'thirdweb-testnet';
  transactionHash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  walletAddress: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversionRate {
  auraToUsdc: number; // e.g., 0.1 = 1 AURA = 0.1 USDC
  lastUpdated: string;
}

export interface BlockchainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  usdc: string;
  explorer: string;
  nativeCoin: string;
  isTestnet?: boolean;
}

/**
 * Crypto Rewards Service
 * Integrates with Base chain (primary), multiple EVM-compatible chains, and ThirdWeb testnet
 */
export class CryptoRewardsService {
  // Blockchain configurations - Base is primary (fastest, cheapest)
  private blockchains: Record<string, BlockchainConfig> = {
    base: {
      name: 'Base',
      chainId: 8453,
      rpcUrl: 'https://mainnet.base.org',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      explorer: 'https://basescan.org',
      nativeCoin: 'ETH',
      isTestnet: false
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpcUrl: 'https://mainnet.optimism.io',
      usdc: '0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85',
      explorer: 'https://optimistic.etherscan.io',
      nativeCoin: 'ETH',
      isTestnet: false
    },
    arbitrum: {
      name: 'Arbitrum One',
      chainId: 42161,
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      explorer: 'https://arbiscan.io',
      nativeCoin: 'ETH',
      isTestnet: false
    },
    polygon: {
      name: 'Polygon',
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      explorer: 'https://polygonscan.com',
      nativeCoin: 'MATIC',
      isTestnet: false
    },
    'thirdweb-testnet': {
      name: 'ThirdWeb Testnet',
      chainId: 421614, // Arbitrum Sepolia (ThirdWeb testnet base)
      rpcUrl: 'https://sepolia.arbitrum.io/rpc',
      usdc: '0x86aA74b23fc54f0Ca71ecaF82a0055bbc77cBA6f', // Test USDC on Arbitrum Sepolia
      explorer: 'https://sepolia.arbiscan.io',
      nativeCoin: 'ETH',
      isTestnet: true
    }
  };

  private primaryBlockchain = 'base'; // Base chain is fastest and cheapest for rewards
  private conversionRate: ConversionRate = {
    auraToUsdc: 0.1, // 1 AURA = 0.1 USDC (10 cents)
    lastUpdated: new Date().toISOString()
  };

  constructor(
    private kv: KVNamespace,
    private etherscanKey?: string
  ) {}

  /**
   * Request reward mint (creates transaction for backend to process)
   */
  async requestRewardMint(
    userId: string,
    auraTokens: number,
    walletAddress: string,
    blockchain: 'base' | 'optimism' | 'arbitrum' | 'polygon' = 'base'
  ): Promise<CryptoReward | null> {
    try {
      if (!this.isValidWallet(walletAddress)) {
        return null;
      }

      const usdcAmount = auraTokens * this.conversionRate.auraToUsdc;

      const reward: CryptoReward = {
        id: `reward_${crypto.randomUUID()}`,
        userId,
        auraTokens,
        usdcAmount,
        blockchain,
        status: 'pending',
        walletAddress,
        createdAt: new Date().toISOString(),
        metadata: { blockchain }
      };

      await this.kv.put(
        `reward:${reward.id}`,
        JSON.stringify(reward)
      );

      // Add to user's pending rewards queue
      await this.addToPendingQueue(userId, reward.id);

      return reward;
    } catch {
      return null;
    }
  }

  /**
   * Process reward (called by backend/bridge)
   * Would integrate with actual blockchain transaction
   */
  async processReward(rewardId: string, transactionHash: string): Promise<CryptoReward | null> {
    try {
      const reward = await this.kv.get(`reward:${rewardId}`, 'json');
      if (!reward) return null;

      const updatedReward: CryptoReward = {
        ...(reward as CryptoReward),
        status: 'processing' as const,
        transactionHash
      };

      await this.kv.put(`reward:${rewardId}`, JSON.stringify(updatedReward));
      return updatedReward;
    } catch {
      return null;
    }
  }

  /**
   * Complete reward after blockchain confirmation
   */
  async completeReward(rewardId: string): Promise<CryptoReward | null> {
    try {
      const reward = await this.kv.get(`reward:${rewardId}`, 'json');
      if (!reward) return null;

      const completedReward: CryptoReward = {
        ...(reward as CryptoReward),
        status: 'completed' as const,
        completedAt: new Date().toISOString()
      };

      await this.kv.put(`reward:${rewardId}`, JSON.stringify(completedReward));

      // Update user's minted rewards counter
      await this.updateUserMintedRewards((reward as CryptoReward).userId, (reward as CryptoReward).usdcAmount);

      return completedReward;
    } catch {
      return null;
    }
  }

  /**
   * Fail reward processing
   */
  async failReward(rewardId: string, reason: string): Promise<CryptoReward | null> {
    try {
      const reward = await this.kv.get(`reward:${rewardId}`, 'json');
      if (!reward) return null;

      const failedReward: CryptoReward = {
        ...(reward as CryptoReward),
        status: 'failed' as const,
        metadata: {
          ...(reward as CryptoReward).metadata,
          failReason: reason
        }
      };

      await this.kv.put(`reward:${rewardId}`, JSON.stringify(failedReward));
      return failedReward;
    } catch {
      return null;
    }
  }

  /**
   * Get user's reward history
   */
  async getUserRewards(userId: string): Promise<CryptoReward[]> {
    try {
      const rewardsJson = await this.kv.get(`user:rewards:${userId}`);
      if (!rewardsJson) return [];

      return JSON.parse(rewardsJson) as CryptoReward[];
    } catch {
      return [];
    }
  }

  /**
   * Get pending rewards for processing
   */
  async getPendingRewards(limit: number = 100): Promise<CryptoReward[]> {
    try {
      const pending = await this.kv.get(`rewards:pending`);
      if (!pending) return [];

      const rewardIds = (JSON.parse(pending) as string[]).slice(0, limit);
      const rewards: CryptoReward[] = [];

      for (const rewardId of rewardIds) {
        const reward = await this.kv.get(`reward:${rewardId}`, 'json');
        if (reward) {
          rewards.push(reward as CryptoReward);
        }
      }

      return rewards;
    } catch {
      return [];
    }
  }

  /**
   * Get reward by ID
   */
  async getReward(rewardId: string): Promise<CryptoReward | null> {
    try {
      const reward = await this.kv.get(`reward:${rewardId}`, 'json');
      return reward as CryptoReward | null;
    } catch {
      return null;
    }
  }

  /**
   * Update conversion rate (admin only)
   */
  async updateConversionRate(auraToUsdc: number): Promise<ConversionRate> {
    this.conversionRate = {
      auraToUsdc,
      lastUpdated: new Date().toISOString()
    };

    await this.kv.put(
      `config:conversion-rate`,
      JSON.stringify(this.conversionRate)
    );

    return this.conversionRate;
  }

  /**
   * Get current conversion rate
   */
  getConversionRate(): ConversionRate {
    return this.conversionRate;
  }

  /**
   * Calculate USDC amount from AURA tokens
   */
  calculateUsdcAmount(auraTokens: number): number {
    return auraTokens * this.conversionRate.auraToUsdc;
  }

  /**
   * Generate USDC transfer ABI call data
   * This would be used to construct actual blockchain transactions
   */
  generateTransferCallData(
    walletAddress: string,
    usdcAmount: number
  ): { to: string; data: string; value: string } {
    // USDC transfer function signature: transfer(address to, uint256 amount)
    // Function selector: 0xa9059cbb
    const selector = 'a9059cbb';
    // Pad wallet address
    const paddedAddress = walletAddress.replace('0x', '').padStart(64, '0');
    
    // Convert amount to Wei (6 decimals for USDC)
    const amountInWei = (usdcAmount * 1e6).toString(16).padStart(64, '0');

    const blockchain = this.blockchains[this.primaryBlockchain];
    return {
      to: blockchain.usdc,
      data: `0x${selector}${paddedAddress}${amountInWei}`,
      value: '0'
    };
  }

  /**
   * Validate Ethereum wallet address
   */
  private isValidWallet(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Add reward to pending queue
   */
  private async addToPendingQueue(userId: string, rewardId: string): Promise<void> {
    try {
      const pending = await this.kv.get(`rewards:pending`);
      let rewardIds: string[] = pending ? JSON.parse(pending) : [];
      rewardIds.push(rewardId);
      await this.kv.put(`rewards:pending`, JSON.stringify(rewardIds));

      // Also add to user's personal queue
      const userRewards = await this.kv.get(`user:rewards:${userId}`);
      let userRewardIds: string[] = userRewards ? JSON.parse(userRewards) : [];
      userRewardIds.push(rewardId);
      await this.kv.put(`user:rewards:${userId}`, JSON.stringify(userRewardIds));
    } catch {
      // Silently fail on queue update
    }
  }

  /**
   * Update user's total minted rewards
   */
  private async updateUserMintedRewards(userId: string, usdcAmount: number): Promise<void> {
    try {
      const key = `user:minted-rewards:${userId}`;
      const existing = await this.kv.get(key);
      const current = existing ? parseFloat(existing) : 0;
      await this.kv.put(key, (current + usdcAmount).toString());
    } catch {
      // Silently fail
    }
  }
}
