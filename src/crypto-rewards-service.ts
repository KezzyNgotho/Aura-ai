/**
 * Crypto Rewards Service
 * Handles conversion of Aura tokens to real-world crypto (USDC/Base chain)
 * and manages on-chain rewards minting
 */

export interface CryptoReward {
  id: string;
  userId: string;
  auraTokens: number;
  usdcAmount: number;
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

/**
 * Crypto Rewards Service
 * Integrates with Base chain for USDC rewards
 */
export class CryptoRewardsService {
  private contractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
  private baseChainId = 8453;
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
    platform: string = 'base'
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
        status: 'pending',
        walletAddress,
        createdAt: new Date().toISOString(),
        metadata: { platform }
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

    return {
      to: this.contractAddress,
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
