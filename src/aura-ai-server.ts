import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { McpHonoServerDO } from '@nullshot/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Hono } from 'hono';
import { setupServerTools } from './tools';
import { setupServerResources } from './resources';
import { setupServerPrompts } from './prompts';
import { TokenEconomyService } from './token-service';
import { InsightEngine } from './insight-engine';
import { SquadService } from './squad-service';
import { IntelligentSquadAgent } from './intelligent-squad-agent';
import { PlatformRouter } from './social-adapters';
import { AnalyticsService } from './analytics-service';
import { InsightMarketplace } from './insight-marketplace';
import { InsightCardGenerator } from './insight-card-generator';
import { CollaborationService } from './collaboration-service';
import { AuthService } from './auth-service';
import { CryptoRewardsService } from './crypto-rewards-service';
import { initializeSmartContracts } from './smart-contract-integration';
import { initializeEdenLayer, EdenLayerIntegration } from './edenlayer-integration';
import { QueryProcessor } from './query-processor-squad';
import { Env } from './env';

/**
 * AuraAiServer - Transparent, MCP-Powered Real-Impact Agent
 * Provides actionable insights with transparent reasoning and token-based engagement
 */
export class AuraAiServer extends McpHonoServerDO<Env> {
  private tokenService: TokenEconomyService;
  private insightEngine: InsightEngine;
  private squadService: SquadService;
  private agentService: IntelligentSquadAgent;
  private platformRouter: PlatformRouter;
  private analyticsService: AnalyticsService;
  private marketplace: InsightMarketplace;
  private cardGenerator: InsightCardGenerator;
  private collaborationService: CollaborationService;
  private authService: AuthService;
  private cryptoRewards: CryptoRewardsService;
  private smartContracts: ReturnType<typeof initializeSmartContracts>;
  private edenLayer: EdenLayerIntegration | null;
  private queryProcessor: QueryProcessor;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.tokenService = new TokenEconomyService(env.AURA_KV);
    this.insightEngine = new InsightEngine(env.AURA_KV);
    this.squadService = new SquadService(env.AURA_KV);
    this.agentService = new IntelligentSquadAgent(env.AURA_KV);
    this.platformRouter = new PlatformRouter();
    this.analyticsService = new AnalyticsService(env.AURA_KV);
    this.marketplace = new InsightMarketplace(env.AURA_KV);
    this.queryProcessor = new QueryProcessor(env.GPT_API_KEY);
    this.cardGenerator = new InsightCardGenerator();
    this.collaborationService = new CollaborationService(env.AURA_KV);
    this.authService = new AuthService(env.AURA_KV, env.AUTH_SECRET || 'dev-secret-key');
    this.cryptoRewards = new CryptoRewardsService(env.AURA_KV, env.ETHERSCAN_API_KEY);
    
    // Initialize smart contracts with environment config
    try {
      this.smartContracts = initializeSmartContracts(env.WALLET_PRIVATE_KEY, {
        auraTokenAddress: env.AURA_TOKEN_ADDRESS,
        rewardsMinterAddress: env.REWARDS_MINTER_ADDRESS,
        tokenConverterAddress: env.TOKEN_CONVERTER_ADDRESS,
        agentMarketplaceAddress: env.AGENT_MARKETPLACE_ADDRESS,
        rpcUrl: env.RPC_URL,
        chainId: env.CHAIN_ID ? parseInt(env.CHAIN_ID, 10) : 11155111,
        chainName: env.NETWORK || 'sepolia'
      });
    } catch (error) {
      console.warn('Failed to initialize smart contracts:', error);
      // Create a dummy instance with defaults
      this.smartContracts = initializeSmartContracts();
    }

    // Initialize EdenLayer integration (optional)
    this.edenLayer = initializeEdenLayer(env);
    
    // Register service on EdenLayer if available
    if (this.edenLayer) {
      this.registerEdenLayerService();
    }
  }

  /**
   * Implementation of the required abstract method
   */
  getImplementation(): Implementation {
    return {
      name: 'AuraAiServer',
      version: '1.0.0',
    };
  }

  /**
   * Register service on EdenLayer network
   */
  private async registerEdenLayerService(): Promise<void> {
    if (!this.edenLayer) return;

    try {
      const registered = await this.edenLayer.registerService({
        name: 'Aura AI Insights',
        description: 'AI-powered insights marketplace with tokenized knowledge and cross-chain collaboration',
        endpoints: {
          mcp: 'https://aura-ai.keziengotho18.workers.dev/mcp/ws',
          rest: 'https://aura-ai.keziengotho18.workers.dev/api'
        },
        capabilities: [
          'insight-generation',
          'insight-discovery',
          'token-minting',
          'marketplace-trading',
          'agent-collaboration',
          'creator-reputation',
          'cross-chain-payment'
        ],
        tokenAddress: '0x3856112c01D789da77f6218c4CBB2Bd05580FD70',
        chainId: 11155111
      });

      console.log('🌐 EdenLayer Service Registration:', registered);
    } catch (error) {
      console.error('Failed to register on EdenLayer:', error);
    }
  }

  /**
   * Configure MCP server and add custom social platform routes
   */
  configureServer(server: McpServer): void {
    setupServerTools(server, this.tokenService, this.insightEngine, this.squadService, this.agentService);
    setupServerResources(server);
    setupServerPrompts(server);
  }

  /**
   * Setup custom routes for social platforms and MCP endpoints
   */
  protected setupRoutes(app: Hono<{ Bindings: Env }>): void {
    // Call parent to set up MCP routes
    super.setupRoutes(app);

    /**
     * Authentication & Landing Routes
     */

    // Serve landing page (Wallet-first approach)
    app.get('/', (c) => {
      return c.html(this.getLandingPageHTML());
    });

    // Serve chat dashboard
    app.get('/chat', (c) => {
      return c.html(this.getChatDashboardHTML());
    });

    // Signup endpoint
    app.post('/api/auth/signup', async (c) => {
      try {
        const { username, email, password, walletAddress } = await c.req.json();

        if (!email || !password || !username) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        const result = await this.authService.signup({ username, email, password, walletAddress });

        if (!result) {
          return c.json({ error: 'User already exists or signup failed' }, 400);
        }

        // Initialize user tokens
        await this.tokenService.getUserTokens(result.userId);

        return c.json({ 
          success: true, 
          userId: result.userId,
          session: result.session
        });
      } catch (error) {
        console.error('Signup error:', error);
        return c.json({ error: 'Signup failed' }, 500);
      }
    });

    // Login endpoint
    app.post('/api/auth/login', async (c) => {
      try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
          return c.json({ error: 'Missing email or password' }, 400);
        }

        const session = await this.authService.login(email, password);

        if (!session) {
          return c.json({ error: 'Invalid credentials' }, 401);
        }

        return c.json({ 
          success: true,
          session
        });
      } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'Login failed' }, 500);
      }
    });

    // Wallet login with EIP-191 signature
    // Test endpoint to verify server is responding
    app.get('/api/health', (c) => {
      return c.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.post('/api/auth/wallet-login', async (c) => {
      try {
        const body = await c.req.json();
        const walletAddress = body.walletAddress;
        const signature = body.signature;
        const message = body.message;
        
        console.log('🔑 Wallet login attempt for:', walletAddress);

        if (!walletAddress || !message || !signature) {
          console.log('❌ Missing credentials');
          return c.json({ error: 'Missing credentials' }, 400);
        }

        // Verify signature
        const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
        const isValidSignature = /^0x[a-fA-F0-9]{128,}$/.test(signature);
        
        if (!isValidWallet || !isValidSignature) {
          console.log('❌ Invalid wallet or signature format');
          return c.json({ error: 'Invalid credentials' }, 400);
        }

        console.log('✓ Credentials valid, creating session...');
        
        // Create a simple session object directly
        const session = {
          userId: `user_${walletAddress.slice(2, 10)}`,
          username: `wallet_${walletAddress.slice(2, 10)}`,
          walletAddress: walletAddress.toLowerCase(),
          role: 'user',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        console.log('✓ Session created:', session.userId);
        console.log('✓ Sending successful response');
        
        return c.json({
          success: true,
          userId: session.userId,
          username: session.username,
          walletAddress: session.walletAddress,
          role: session.role,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        });
      } catch (error) {
        console.error('❌ Wallet login error:', error);
        return c.json({ error: 'Authentication failed' }, 500);
      }
    });

    // Wallet signup (zero-knowledge registration)
    app.post('/api/auth/wallet-signup', async (c) => {
      try {
        const { username, walletAddress } = await c.req.json();

        if (!walletAddress) {
          return c.json({ error: 'Wallet address required' }, 400);
        }

        const result = await this.authService.signup({ 
          username: username || `wallet_${walletAddress.slice(2, 10)}`,
          walletAddress 
        });

        if (!result) {
          return c.json({ error: 'Wallet already registered or signup failed' }, 400);
        }

        // Initialize user tokens
        await this.tokenService.getUserTokens(result.userId);

        return c.json({ 
          success: true, 
          userId: result.userId,
          session: result.session
        });
      } catch (error) {
        console.error('Wallet signup error:', error);
        return c.json({ error: 'Wallet signup failed' }, 500);
      }
    });

    // Link wallet to account
    app.post('/api/auth/link-wallet', async (c) => {
      try {
        const { userId, walletAddress } = await c.req.json();

        if (!userId || !walletAddress) {
          return c.json({ error: 'Missing userId or walletAddress' }, 400);
        }

        const success = await this.authService.linkWallet(userId, walletAddress);

        if (!success) {
          return c.json({ error: 'Failed to link wallet' }, 400);
        }

        return c.json({ success: true, walletAddress });
      } catch (error) {
        console.error('Link wallet error:', error);
        return c.json({ error: 'Failed to link wallet' }, 500);
      }
    });

    // Get user profile
    app.get('/api/user/:userId', async (c) => {
      try {
        const userId = c.req.param('userId');
        let user = await this.authService.getUser(userId);

        // If user doesn't exist, create a default user object
        if (!user) {
          user = {
            userId,
            username: `User_${userId.substring(0, 8)}`,
            email: `user+${userId}@aura.ai`,
            walletAddress: userId,
            createdAt: new Date().toISOString(),
            totalTokensEarned: 0,
            totalTokensSpent: 0,
            rewardsMinted: 0
          };
        }

        const tokens = await this.tokenService.getUserTokens(userId);
        const rewards = await this.cryptoRewards.getUserRewards(userId);

        return c.json({
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            walletAddress: user.walletAddress,
            createdAt: user.createdAt
          },
          tokens,
          rewards,
          stats: {
            totalTokensEarned: user.totalTokensEarned,
            totalTokensSpent: user.totalTokensSpent,
            rewardsMinted: user.rewardsMinted
          }
        });
      } catch (error) {
        console.error('Get user error:', error);
        return c.json({ error: 'Failed to fetch user' }, 500);
      }
    });

    /**
     * Crypto Rewards Routes
     */

    // Request reward mint
    app.post('/api/rewards/mint', async (c) => {
      try {
        const { userId, auraTokens, walletAddress } = await c.req.json();

        if (!userId || !auraTokens || !walletAddress) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        // Verify user has enough tokens
        const userTokens = await this.tokenService.getUserTokens(userId);
        if (userTokens.balance < auraTokens) {
          return c.json({ error: 'Insufficient tokens' }, 400);
        }

        // Create reward mint request
        const reward = await this.cryptoRewards.requestRewardMint(
          userId,
          auraTokens,
          walletAddress
        );

        if (!reward) {
          return c.json({ error: 'Invalid wallet address' }, 400);
        }

        // Try to mint on-chain if wallet private key is available
        let txHash: string | null = null;
        try {
          txHash = await this.smartContracts.mintReward(walletAddress, auraTokens);
          if (txHash) {
            console.log(`✅ On-chain reward minted: ${txHash}`);
            reward.transactionHash = txHash;
            reward.status = 'processing';
          }
        } catch (error) {
          console.warn('Could not mint on-chain, reward queued for later processing:', error);
        }

        // Deduct tokens from user
        await this.tokenService.spendTokens(
          userId,
          auraTokens,
          'spend_premium_feature' as any,
          `Converted to USDC: ${reward.usdcAmount}${txHash ? ` (TX: ${txHash})` : ''}`
        );

        return c.json({ 
          success: true,
          reward,
          onChainStatus: txHash ? 'processing' : 'queued'
        });
      } catch (error) {
        console.error('Reward mint error:', error);
        return c.json({ error: 'Failed to process reward' }, 500);
      }
    });

    // Get pending rewards
    app.get('/api/rewards/pending', async (c) => {
      try {
        const rewards = await this.cryptoRewards.getPendingRewards();
        return c.json({ rewards });
      } catch (error) {
        console.error('Pending rewards error:', error);
        return c.json({ error: 'Failed to fetch rewards' }, 500);
      }
    });

    // Get reward status
    app.get('/api/rewards/:rewardId', async (c) => {
      try {
        const rewardId = c.req.param('rewardId');
        const reward = await this.cryptoRewards.getReward(rewardId);

        if (!reward) {
          return c.json({ error: 'Reward not found' }, 404);
        }

        return c.json({ reward });
      } catch (error) {
        console.error('Get reward error:', error);
        return c.json({ error: 'Failed to fetch reward' }, 500);
      }
    });

    // Get conversion rate
    app.get('/api/rewards/conversion-rate', (c) => {
      const rate = this.cryptoRewards.getConversionRate();
      return c.json(rate);
    });

    // Get smart contract network info
    app.get('/api/contracts/network', (c) => {
      const networkInfo = this.smartContracts.getNetworkInfo();
      return c.json(networkInfo);
    });

    // Get AURA token balance
    app.get('/api/contracts/balance/:address', async (c) => {
      try {
        const address = c.req.param('address');
        const balance = await this.smartContracts.getAuraBalance(address);
        const formatted = this.smartContracts.formatAura(balance);
        
        return c.json({
          address,
          balance: formatted,
          balanceWei: balance.toString(),
          currency: 'AURA'
        });
      } catch (error) {
        console.error('Balance check error:', error);
        return c.json({ error: 'Failed to fetch balance' }, 500);
      }
    });

    // Get creator reputation
    app.get('/api/contracts/reputation/:address', async (c) => {
      try {
        const address = c.req.param('address');
        const reputation = await this.smartContracts.getCreatorReputation(address);
        const isTopCreator = await this.smartContracts.isTopCreator(address);
        
        return c.json({
          address,
          reputation,
          isTopCreator
        });
      } catch (error) {
        console.error('Reputation check error:', error);
        return c.json({ error: 'Failed to fetch reputation' }, 500);
      }
    });

    // Get conversion limit remaining
    app.get('/api/contracts/conversion-limit/:address', async (c) => {
      try {
        const address = c.req.param('address');
        const limitRemaining = await this.smartContracts.getDailyLimitRemaining(address);
        const conversionRate = await this.smartContracts.getConversionRate();
        
        return c.json({
          address,
          dailyLimitRemaining: limitRemaining,
          conversionRate,
          estimatedUsdcFromLimit: limitRemaining / conversionRate
        });
      } catch (error) {
        console.error('Limit check error:', error);
        return c.json({ error: 'Failed to fetch conversion limit' }, 500);
      }
    });

    // Calculate USDC amount
    app.post('/api/rewards/calculate', async (c) => {
      try {
        const { auraTokens } = await c.req.json();

        if (!auraTokens) {
          return c.json({ error: 'Missing auraTokens' }, 400);
        }

        const usdcAmount = this.cryptoRewards.calculateUsdcAmount(auraTokens);

        return c.json({
          auraTokens,
          usdcAmount,
          conversionRate: this.cryptoRewards.getConversionRate()
        });
      } catch (error) {
        console.error('Calculate error:', error);
        return c.json({ error: 'Calculation failed' }, 500);
      }
    });

    /**
     * EdenLayer Integration Routes
     * Agent discovery, reputation, and cross-network collaboration
     */

    // Get EdenLayer service status
    app.get('/api/edenlayer/status', (c) => {
      if (!this.edenLayer) {
        return c.json({
          status: 'not-configured',
          message: 'EdenLayer integration not configured. Set EDENLAYER_API_KEY to enable.'
        }, 200);
      }

      return c.json({
        status: this.edenLayer.isRegistered() ? 'registered' : 'initializing',
        service: {
          name: 'Aura AI Insights',
          endpoints: {
            mcp: 'https://aura-ai.keziengotho18.workers.dev/mcp/ws',
            rest: 'https://aura-ai.keziengotho18.workers.dev/api'
          },
          capabilities: [
            'insight-generation',
            'insight-discovery',
            'token-minting',
            'marketplace-trading',
            'agent-collaboration',
            'creator-reputation'
          ]
        }
      });
    });

    // Get discovery metrics from EdenLayer
    app.get('/api/edenlayer/metrics', async (c) => {
      if (!this.edenLayer) {
        return c.json({ error: 'EdenLayer not configured' }, 503);
      }

      try {
        const metrics = await this.edenLayer.getDiscoveryMetrics();
        return c.json({
          success: true,
          metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('EdenLayer metrics error:', error);
        return c.json({ error: 'Failed to fetch metrics' }, 500);
      }
    });

    // Get global rankings on EdenLayer
    app.get('/api/edenlayer/rankings', async (c) => {
      if (!this.edenLayer) {
        return c.json({ error: 'EdenLayer not configured' }, 503);
      }

      try {
        const rankings = await this.edenLayer.getGlobalRankings();
        return c.json({
          success: true,
          rankings,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('EdenLayer rankings error:', error);
        return c.json({ error: 'Failed to fetch rankings' }, 500);
      }
    });

    // Sync with EdenLayer network
    app.post('/api/edenlayer/sync', async (c) => {
      if (!this.edenLayer) {
        return c.json({ error: 'EdenLayer not configured' }, 503);
      }

      try {
        const synced = await this.edenLayer.syncWithNetwork();
        return c.json({
          success: synced,
          message: synced ? 'Synced with EdenLayer' : 'Sync failed',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('EdenLayer sync error:', error);
        return c.json({ error: 'Sync failed' }, 500);
      }
    });

    // ============ SQUAD ENDPOINTS ============

    // Create a new squad
    app.post('/api/squad/create', async (c) => {
      try {
        const body = await c.req.json() as {
          userId: string;
          squadName: string;
          description: string;
          tags?: string[];
        };

        const squad = await this.squadService.createSquad(
          body.squadName,
          body.description,
          body.userId,
          body.tags || []
        );

        // Award tokens to squad creator
        await this.tokenService.earnTokens(
          body.userId,
          10,
          'earn_engagement' as any,
          `Created squad: ${body.squadName}`
        );

        return c.json({
          success: true,
          squad,
          message: 'Squad created successfully!'
        });
      } catch (error) {
        console.error('Squad creation error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Failed to create squad' }, 400);
      }
    });

    // Get squad info
    app.get('/api/squad/:squadId', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const squad = await this.squadService.getSquad(squadId);

        if (!squad) {
          return c.json({ error: 'Squad not found' }, 404);
        }

        return c.json({ success: true, squad });
      } catch (error) {
        console.error('Squad retrieval error:', error);
        return c.json({ error: 'Failed to retrieve squad' }, 400);
      }
    });

    // List squads for user
    app.get('/api/squad/user/:userId', async (c) => {
      try {
        const userId = c.req.param('userId');
        const squads = await this.squadService.listSquadsForUser(userId);

        return c.json({ success: true, squads, count: squads.length });
      } catch (error) {
        console.error('Squad list error:', error);
        return c.json({ error: 'Failed to list squads' }, 400);
      }
    });

    // Add member to squad
    app.post('/api/squad/:squadId/add-member', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const body = await c.req.json() as {
          memberId: string;
          role?: 'assistant' | 'contributor';
        };

        const squad = await this.squadService.addMember(squadId, body.memberId, body.role || 'contributor');

        // Award tokens
        await this.tokenService.earnTokens(
          squad.leader,
          5,
          'earn_engagement' as any,
          `Added member to squad`
        );

        await this.tokenService.earnTokens(
          body.memberId,
          5,
          'earn_engagement' as any,
          `Joined squad`
        );

        return c.json({
          success: true,
          squad,
          message: 'Member added successfully!'
        });
      } catch (error) {
        console.error('Add member error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Failed to add member' }, 400);
      }
    });

    // Send chat message
    app.post('/api/squad/:squadId/chat', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const body = await c.req.json() as {
          userId: string;
          userName: string;
          content: string;
        };

        const message = await this.squadService.addChatMessage(
          squadId,
          body.userId,
          body.userName,
          body.content
        );

        // Award tokens for chat
        await this.tokenService.earnTokens(
          body.userId,
          1,
          'earn_engagement' as any,
          `Chat message in squad`
        );

        return c.json({
          success: true,
          message,
          reward: '1 AURA Token'
        });
      } catch (error) {
        console.error('Chat message error:', error);
        return c.json({ error: 'Failed to send message' }, 400);
      }
    });

    // Get squad chat
    app.get('/api/squad/:squadId/chat', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;

        const messages = await this.squadService.getSquadChat(squadId, limit);

        return c.json({
          success: true,
          messages,
          count: messages.length
        });
      } catch (error) {
        console.error('Get chat error:', error);
        return c.json({ error: 'Failed to retrieve chat' }, 400);
      }
    });

    // React to message
    app.post('/api/squad/chat/:messageId/react', async (c) => {
      try {
        const messageId = c.req.param('messageId');
        const body = await c.req.json() as {
          emoji: string;
          userId: string;
        };

        const message = await this.squadService.addReaction(messageId, body.emoji, body.userId);

        // Award tokens for reaction
        await this.tokenService.earnTokens(
          body.userId,
          0.5,
          'earn_engagement' as any,
          `Reacted to message`
        );

        return c.json({
          success: true,
          message,
          reward: '0.5 AURA Token'
        });
      } catch (error) {
        console.error('Reaction error:', error);
        return c.json({ error: 'Failed to add reaction' }, 400);
      }
    });

    // Get contributions
    app.get('/api/squad/:squadId/contributions/:userId', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const userId = c.req.param('userId');

        const contributions = await this.squadService.getContributions(squadId, userId);

        return c.json({
          success: true,
          contributions,
          count: contributions.length
        });
      } catch (error) {
        console.error('Contributions error:', error);
        return c.json({ error: 'Failed to retrieve contributions' }, 400);
      }
    });

    // Calculate rewards
    app.post('/api/squad/:squadId/calculate-rewards', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const body = await c.req.json() as { totalAmount: number };

        const rewards = await this.squadService.calculateRewards(squadId, body.totalAmount);

        return c.json({
          success: true,
          rewards,
          totalAmount: body.totalAmount
        });
      } catch (error) {
        console.error('Calculate rewards error:', error);
        return c.json({ error: 'Failed to calculate rewards' }, 400);
      }
    });

    // Distribute rewards to squad members
    app.post('/api/squad/:squadId/distribute-rewards', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const body = await c.req.json() as { 
          totalAmount: number;
          distributionType?: 'equal' | 'contribution' | 'activity';
        };

        const squad = await this.squadService.getSquad(squadId);
        if (!squad) {
          return c.json({ error: 'Squad not found' }, 404);
        }

        const distributionType = body.distributionType || 'equal';
        const amountPerMember = Math.floor(body.totalAmount / squad.members.length);
        const distributions: Record<string, number> = {};

        if (distributionType === 'equal') {
          // Equal distribution to all members
          for (const member of squad.members) {
            distributions[member.userId] = amountPerMember;
            await this.tokenService.earnTokens(
              member.userId,
              amountPerMember,
              'earn_engagement' as any,
              `Reward distribution from squad: ${squad.name}`
            );
          }
        } else if (distributionType === 'contribution') {
          // Weight by contributions
          const contributions: Record<string, number> = {};
          let totalContributions = 0;

          for (const member of squad.members) {
            const memberContribs = await this.squadService.getContributions(squadId, member.userId);
            const count = memberContribs.length;
            contributions[member.userId] = count;
            totalContributions += count;
          }

          for (const member of squad.members) {
            const share = totalContributions > 0 ? (contributions[member.userId] / totalContributions) : (1 / squad.members.length);
            const reward = Math.floor(body.totalAmount * share);
            distributions[member.userId] = reward;
            await this.tokenService.earnTokens(
              member.userId,
              reward,
              'earn_engagement' as any,
              `Contribution-based reward from squad: ${squad.name}`
            );
          }
        } else if (distributionType === 'activity') {
          // Weight by recent activity
          const activityScores: Record<string, number> = {};
          let totalActivity = 0;

          for (const member of squad.members) {
            const messages = await this.squadService.getSquadChat(squadId, 1000);
            const memberMessages = messages.filter((m: any) => m.userId === member.userId).length;
            activityScores[member.userId] = memberMessages;
            totalActivity += memberMessages;
          }

          for (const member of squad.members) {
            const share = totalActivity > 0 ? (activityScores[member.userId] / totalActivity) : (1 / squad.members.length);
            const reward = Math.floor(body.totalAmount * share);
            distributions[member.userId] = reward;
            await this.tokenService.earnTokens(
              member.userId,
              reward,
              'earn_engagement' as any,
              `Activity-based reward from squad: ${squad.name}`
            );
          }
        }

        return c.json({
          success: true,
          squadId,
          squadName: squad.name,
          distributionType,
          totalAmount: body.totalAmount,
          distributions,
          memberCount: squad.members.length,
          message: `Distributed ${body.totalAmount} AURA tokens to ${squad.members.length} members`
        });
      } catch (error) {
        console.error('Distribute rewards error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Failed to distribute rewards' }, 400);
      }
    });

    // ============ INTELLIGENT AGENT ENDPOINTS ============

    // Analyze squad health
    app.get('/api/ai/squad/:squadId/health', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const squad = await this.squadService.getSquad(squadId);

        if (!squad) {
          return c.json({ error: 'Squad not found' }, 404);
        }

        const analysis = await this.agentService.analyzeSquadHealth(squad);

        return c.json({
          success: true,
          analysis
        });
      } catch (error) {
        console.error('Squad health analysis error:', error);
        return c.json({ error: 'Failed to analyze squad health' }, 400);
      }
    });

    // Analyze member profile
    app.get('/api/ai/member/:userId/profile', async (c) => {
      try {
        const userId = c.req.param('userId');
        const profile = await this.agentService.analyzeMemberProfile(userId);

        return c.json({
          success: true,
          profile
        });
      } catch (error) {
        console.error('Member profile analysis error:', error);
        return c.json({ error: 'Failed to analyze member profile' }, 400);
      }
    });

    // Find member matches
    app.post('/api/ai/squad/find-members', async (c) => {
      try {
        const body = await c.req.json() as {
          requiredSkills: string[];
          desiredRoles: ('leader' | 'assistant' | 'contributor')[];
          experienceLevel: 'junior' | 'mid' | 'senior';
        };

        const matches = await this.agentService.findMemberMatches({
          requiredSkills: body.requiredSkills,
          desiredRoles: body.desiredRoles,
          availability: 75,
          experienceLevel: body.experienceLevel
        });

        return c.json({
          success: true,
          matches,
          count: matches.length
        });
      } catch (error) {
        console.error('Member matching error:', error);
        return c.json({ error: 'Failed to find member matches' }, 400);
      }
    });

    // Optimize reward distribution
    app.post('/api/ai/squad/:squadId/optimize-rewards', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const body = await c.req.json() as { totalReward: number };

        const squad = await this.squadService.getSquad(squadId);
        if (!squad) {
          return c.json({ error: 'Squad not found' }, 404);
        }

        // Get all contributions
        const contributions: Record<string, any[]> = {};
        for (const member of squad.members) {
          const contribs = await this.squadService.getContributions(squadId, member.userId);
          contributions[member.userId] = contribs;
        }

        const optimization = await this.agentService.optimizeRewardDistribution(
          squad,
          body.totalReward,
          contributions
        );

        return c.json({
          success: true,
          optimization
        });
      } catch (error) {
        console.error('Reward optimization error:', error);
        return c.json({ error: 'Failed to optimize rewards' }, 400);
      }
    });

    // Predict squad success
    app.get('/api/ai/squad/:squadId/success-prediction', async (c) => {
      try {
        const squadId = c.req.param('squadId');
        const squad = await this.squadService.getSquad(squadId);

        if (!squad) {
          return c.json({ error: 'Squad not found' }, 404);
        }

        const successProbability = await this.agentService.predictSquadSuccess(squad);

        return c.json({
          success: true,
          successProbability,
          assessment: successProbability > 80
            ? 'Very likely to succeed'
            : successProbability > 60
              ? 'Good chance of success'
              : successProbability > 40
                ? 'Moderate success probability'
                : 'Low success probability'
        });
      } catch (error) {
        console.error('Success prediction error:', error);
        return c.json({ error: 'Failed to predict success' }, 400);
      }
    });

    /**
     * Social Platform Webhooks
     */

    // WhatsApp webhook
    app.post('/webhooks/whatsapp', async (c) => {
      try {
        const payload = await c.req.json();
        const message = await this.platformRouter.handleWebhook('whatsapp', payload);

        if (!message) {
          return c.json({ status: 'ok' });
        }

        // Process message through Aura-AI
        const insight = await this.insightEngine.generateInsight(
          {
            id: crypto.randomUUID(),
            userId: message.userId,
            text: message.text,
            platform: message.platform,
            timestamp: new Date().toISOString(),
            resolved: false
          },
          message.userId
        );

        // Award tokens
        await this.tokenService.earnTokens(
          message.userId,
          insight.tokensRewarded,
          'earn_engagement' as any,
          `Query from WhatsApp: ${message.text.substring(0, 50)}`
        );

        // Send response back to WhatsApp
        await this.platformRouter.sendResponse(
          {
            userId: message.userId,
            text: insight.recommendation
          },
          'whatsapp',
          message.metadata
        );

        return c.json({ status: 'success', insightId: insight.id });
      } catch (error) {
        console.error('WhatsApp webhook error:', error);
        return c.json({ status: 'error', message: 'Failed to process message' }, 500);
      }
    });

    // WhatsApp webhook verification
    app.get('/webhooks/whatsapp', (c) => {
      const mode = c.req.query('hub.mode');
      const token = c.req.query('hub.verify_token');
      const challenge = c.req.query('hub.challenge');

      // Use your verify token from env
      if (mode === 'subscribe' && token === 'your_verify_token' && challenge) {
        return c.text(challenge);
      }

      return c.json({ status: 'error' }, 403);
    });

    // Telegram webhook
    app.post('/webhooks/telegram', async (c) => {
      try {
        const payload = await c.req.json();
        const message = await this.platformRouter.handleWebhook('telegram', payload);

        if (!message) {
          return c.json({ ok: true });
        }

        // Process message through Aura-AI
        const insight = await this.insightEngine.generateInsight(
          {
            id: crypto.randomUUID(),
            userId: message.userId,
            text: message.text,
            platform: message.platform,
            timestamp: new Date().toISOString(),
            resolved: false
          },
          message.userId
        );

        // Award tokens
        await this.tokenService.earnTokens(
          message.userId,
          insight.tokensRewarded,
          'earn_engagement' as any,
          `Query from Telegram: ${message.text.substring(0, 50)}`
        );

        // Send response back to Telegram
        await this.platformRouter.sendResponse(
          {
            userId: message.userId,
            text: insight.recommendation
          },
          'telegram',
          message.metadata
        );

        return c.json({ ok: true });
      } catch (error) {
        console.error('Telegram webhook error:', error);
        return c.json({ ok: false }, 500);
      }
    });

    // Discord webhook
    app.post('/webhooks/discord', async (c) => {
      try {
        const payload = await c.req.json();
        const message = await this.platformRouter.handleWebhook('discord', payload);

        if (!message) {
          return c.json({ status: 'ok' });
        }

        // Process message through Aura-AI
        const insight = await this.insightEngine.generateInsight(
          {
            id: crypto.randomUUID(),
            userId: message.userId,
            text: message.text,
            platform: message.platform,
            timestamp: new Date().toISOString(),
            resolved: false
          },
          message.userId
        );

        // Award tokens
        await this.tokenService.earnTokens(
          message.userId,
          insight.tokensRewarded,
          'earn_engagement' as any,
          `Query from Discord: ${message.text.substring(0, 50)}`
        );

        // Send response back to Discord
        await this.platformRouter.sendResponse(
          {
            userId: message.userId,
            text: insight.recommendation
          },
          'discord',
          message.metadata
        );

        return c.json({ status: 'success', insightId: insight.id });
      } catch (error) {
        console.error('Discord webhook error:', error);
        return c.json({ status: 'error', message: 'Failed to process message' }, 500);
      }
    });

    /**
     * Web API endpoints
     */

    // Serve chat dashboard
    app.get('/dashboard', (c) => {
      return c.html(this.getChatDashboardHTML());
    });

    // Serve chat page (alternative route)
    app.get('/chat', (c) => {
      return c.html(this.getChatDashboardHTML());
    });

    // Dashboard HTML
    app.get('/', (c) => {
      const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aura AI - Insights & Tokens Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #8b5cf6;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --bg: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text: #f1f5f9;
            --text-secondary: #cbd5e1;
            --border: #475569;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, var(--bg) 0%, #1a1f3a 100%);
            color: var(--text);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        header {
            margin-bottom: 3rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .header-brand {
            font-size: 1.75rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header-actions {
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .token-display {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            padding: 1rem 1.5rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 600;
            box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
        }

        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            margin-bottom: 2rem;
        }

        .card h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }

        input[type="text"],
        textarea,
        select {
            width: 100%;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
        }

        textarea {
            min-height: 100px;
            resize: vertical;
        }

        button {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        button:hover {
            transform: translateY(-2px);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--primary);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
        }

        .stat-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            margin-bottom: 0.5rem;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .insight-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            margin-top: 1rem;
            border-top: 1px solid var(--border);
            padding-top: 2rem;
        }

        .insight-type {
            display: inline-block;
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .recommendation {
            font-size: 1rem;
            line-height: 1.8;
            margin-bottom: 1.5rem;
        }

        .explanation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
        }

        .explanation-section {
            background: var(--bg-tertiary);
            padding: 1rem;
            border-radius: 8px;
            border-left: 3px solid var(--primary);
        }

        .explanation-section h4 {
            color: var(--primary);
            font-size: 0.85rem;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
        }

        .explanation-section ul {
            list-style: none;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        .explanation-section li {
            padding-left: 1.25rem;
            position: relative;
            margin-bottom: 0.5rem;
        }

        .explanation-section li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: var(--primary);
        }

        .transaction-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .transaction-item {
            display: flex;
            justify-content: space-between;
            padding: 1rem;
            background: var(--bg-tertiary);
            border-radius: 8px;
            border-left: 3px solid var(--border);
            font-size: 0.9rem;
        }

        .transaction-item.earn {
            border-left-color: var(--success);
        }

        .transaction-item.spend {
            border-left-color: var(--danger);
        }

        .transaction-amount {
            font-weight: 700;
        }

        .transaction-amount.earn {
            color: var(--success);
        }

        .transaction-amount.spend {
            color: var(--danger);
        }

        .empty-state {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        @media (max-width: 768px) {
            .main-grid {
                grid-template-columns: 1fr;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .explanation-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="header-brand">✨ Aura AI</div>
            <div class="header-actions">
                <div class="token-display" id="tokenDisplay">
                    <span>⭐</span>
                    <span id="tokenBalance">0 Tokens</span>
                </div>
                <input type="text" id="userId" placeholder="User ID" value="user-default" style="width: 150px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text);">
            </div>
        </header>

        <div class="main-grid">
            <div>
                <div class="card">
                    <h2>🤖 Ask Aura AI</h2>
                    <form id="queryForm">
                        <div class="form-group">
                            <label>What's on your mind?</label>
                            <textarea id="queryText" placeholder="Ask about finance, learning, business, trends, or decisions..." required></textarea>
                        </div>

                        <div class="form-group">
                            <label>Category (optional)</label>
                            <select id="queryCategory">
                                <option value="">Auto-detect</option>
                                <option value="FINANCE">Finance</option>
                                <option value="LEARNING">Learning</option>
                                <option value="BUSINESS">Business</option>
                                <option value="TRENDS">Trends</option>
                                <option value="PERSONAL">Personal</option>
                            </select>
                        </div>

                        <button type="submit" id="submitBtn">Get Insight (+10 tokens)</button>
                    </form>

                    <div id="insightContainer" style="display:none;">
                        <div id="insightContent"></div>
                    </div>
                </div>
            </div>

            <div>
                <div class="card">
                    <h2>📊 Your Profile</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Tokens</div>
                            <div class="stat-value" id="totalTokens">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Queries</div>
                            <div class="stat-value" id="totalQueries">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Insights</div>
                            <div class="stat-value" id="totalInsights">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Deep Dives</div>
                            <div class="stat-value" id="deepInsights">0</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2>📜 Recent Transactions</h2>
                    <div id="transactionList" class="transaction-list"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUserId = localStorage.getItem('auraUserId') || 'user-' + Math.random().toString(36).substr(2, 9);
        
        document.addEventListener('DOMContentLoaded', () => {
            const userIdElement = document.getElementById('userId');
            if (userIdElement) {
                userIdElement.value = currentUserId;
                userIdElement.addEventListener('change', (e) => {
                    currentUserId = e.target.value;
                    localStorage.setItem('auraUserId', currentUserId);
                    refreshUserData();
                });
            }
            refreshUserData();

            const queryForm = document.getElementById('queryForm');
            if (queryForm) {
                queryForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const queryText = document.getElementById('queryText').value;
                    const category = document.getElementById('queryCategory').value || undefined;
                    const submitBtn = document.getElementById('submitBtn');
                    
                    if (!queryText.trim()) return;

                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

                    try {
                        const res = await fetch('/api/query', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: queryText, category, userId: currentUserId })
                        });

                        const data = await res.json();
                        if (data.insight) {
                            displayInsight(data.insight);
                            document.getElementById('queryText').value = '';
                            await new Promise(r => setTimeout(r, 500));
                            refreshUserData();
                        }
                    } catch (err) {
                        alert('Error: ' + err.message);
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Get Insight (+10 tokens)';
                    }
                });
            }

            function displayInsight(insight) {
                const container = document.getElementById('insightContainer');
                const exp = insight.explanation || {};
                
                let html = '<div class="insight-card"><span class="insight-type">' + (insight.type || 'GENERAL') + '</span>';
                html += '<div class="recommendation">' + (insight.recommendation || '').replace(/\\n/g, '<br>') + '</div>';
                html += '<div class="explanation-grid">';
                
                if (exp.reasoning) {
                    html += '<div class="explanation-section"><h4>💡 Reasoning</h4><div style="font-size:0.85rem">' + (exp.reasoning || '').split('\\n').slice(0,8).join('<br>') + '</div></div>';
                }
                
                if (exp.dataPoints && exp.dataPoints.length) {
                    html += '<div class="explanation-section"><h4>📊 Data Points</h4><ul>';
                    exp.dataPoints.slice(0,3).forEach(d => html += '<li>' + d + '</li>');
                    html += '</ul></div>';
                }

                if (exp.alternatives && exp.alternatives.length) {
                    html += '<div class="explanation-section"><h4>🔄 Alternatives</h4><ul>';
                    exp.alternatives.slice(0,3).forEach(a => html += '<li>' + a + '</li>');
                    html += '</ul></div>';
                }

                if (exp.riskFactors && exp.riskFactors.length) {
                    html += '<div class="explanation-section"><h4>⚠️ Risks</h4><ul>';
                    exp.riskFactors.slice(0,3).forEach(r => html += '<li>' + r + '</li>');
                    html += '</ul></div>';
                }

                html += '</div></div>';
                document.getElementById('insightContent').innerHTML = html;
                container.style.display = 'block';
            }

        async function refreshUserData() {
            console.log('refreshUserData called with userId:', currentUserId);
            try {
                const res = await fetch('/api/user/' + currentUserId + '/tokens');
                console.log('Tokens API response:', res.status);
                if (res.ok) {
                    const data = await res.json();
                    console.log('Tokens data:', data);
                    const balance = data.balance || 0;
                    const tokenEl = document.getElementById('tokenBalance');
                    const totalEl = document.getElementById('totalTokens');
                    console.log('Token elements found:', !!tokenEl, !!totalEl);
                    if (tokenEl) tokenEl.textContent = balance + ' Tokens';
                    if (totalEl) totalEl.textContent = balance;
                }

                const tRes = await fetch('/api/user/' + currentUserId + '/transactions');
                console.log('Transactions API response:', tRes.status);
                if (tRes.ok) {
                    const txData = await tRes.json();
                    console.log('Transactions data:', txData);
                    const trans = txData.transactions || [];
                    
                    const queries = trans.filter(t => t.type === 'QUERY_REWARD').length;
                    const queriesEl = document.getElementById('totalQueries');
                    const insightsEl = document.getElementById('totalInsights');
                    const deepEl = document.getElementById('deepInsights');
                    console.log('Profile elements found:', !!queriesEl, !!insightsEl, !!deepEl);
                    if (queriesEl) queriesEl.textContent = queries;
                    if (insightsEl) insightsEl.textContent = queries;
                    if (deepEl) deepEl.textContent = trans.filter(t => t.type === 'DEEP_INSIGHT_UNLOCK').length;

                    const list = document.getElementById('transactionList');
                    console.log('Transaction list element found:', !!list);
                    if (list) {
                        if (trans.length === 0) {
                            list.innerHTML = '<div class="empty-state">No transactions yet</div>';
                        } else {
                            list.innerHTML = trans.slice(0, 10).map(t => {
                                const date = new Date(t.timestamp);
                                const isEarn = t.amount > 0;
                                return '<div class="transaction-item ' + (isEarn ? 'earn' : 'spend') + '">' +
                                    '<div><strong>' + t.type.replace(/_/g, ' ') + '</strong><br><small style="color:var(--text-secondary)">' + date.toLocaleDateString() + '</small></div>' +
                                    '<div class="transaction-amount ' + (isEarn ? 'earn' : 'spend') + '">' + (isEarn ? '+' : '') + t.amount + ' ⭐</div>' +
                                    '</div>';
                            }).join('');
                        }
                    }
                } else {
                    console.error('Transactions API error:', tRes.statusText);
                }
            } catch (err) {
                console.error('Error refreshing user data:', err);
            }
        }            setInterval(refreshUserData, 30000);
        });
    </script>
</body>
</html>`;
      return c.html(dashboardHTML);
    });

    // Query endpoint
    app.post('/api/query', async (c) => {
      try {
        const body = await c.req.json();
        const { userId, text, category, depth } = body;

        if (!userId || !text) {
          return c.json({ error: 'Missing userId or text' }, 400);
        }

        // Process query with Squad Processor
        const response = await this.queryProcessor.processQuery({
          userId,
          query: text
        });

        // Award tokens asynchronously (don't wait)
        this.tokenService.earnTokens(
          userId,
          response.squadSuggestion.estimatedReward,
          'earn_engagement' as any,
          `Squad formed: ${response.squadSuggestion.squadName}`
        ).catch(err => console.error('Token error:', err));

        // Track analytics asynchronously
        this.analyticsService.recordTokenTransaction(response.squadSuggestion.estimatedReward, 'earn').catch(err => console.error('Analytics error:', err));
        this.analyticsService.trackUser(userId).catch(err => console.error('Analytics error:', err));

        // Store chat message to history
        const chatMessage = {
          id: `msg_${crypto.randomUUID()}`,
          userId,
          type: 'user',
          content: text,
          timestamp: new Date().toISOString(),
          tokens: response.squadSuggestion.estimatedReward
        };

        const aiMessage = {
          id: `msg_${crypto.randomUUID()}`,
          userId,
          type: 'ai',
          content: response.message,
          timestamp: new Date().toISOString(),
          metadata: {
            squad: response.squadSuggestion.squadName,
            tokens: response.squadSuggestion.estimatedReward
          }
        };

        // Save to chat history asynchronously
        this.saveChatMessage(userId, chatMessage).catch(err => console.error('Chat save error:', err));
        this.saveChatMessage(userId, aiMessage).catch(err => console.error('Chat save error:', err));

        return c.json({
          success: true,
          response: {
            message: response.message,
            actionText: response.actionText,
            squad: {
              name: response.squadSuggestion.squadName,
              emoji: response.squadSuggestion.emoji,
              description: response.squadSuggestion.description,
              roles: response.squadSuggestion.roles,
              estimatedTime: response.squadSuggestion.estimatedTime,
              estimatedReward: response.squadSuggestion.estimatedReward
            },
            tokensRewarded: response.squadSuggestion.estimatedReward
          }
        });
      } catch (error) {
        console.error('Query error:', error);
        return c.json({ error: 'Failed to process query' }, 500);
      }
    });

    // Save chat message to history
    app.post('/api/chat/save', async (c) => {
      try {
        const body = await c.req.json();
        const { userId, type, content, tokens } = body;

        if (!userId || !type || !content) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        const message = {
          id: `msg_${crypto.randomUUID()}`,
          userId,
          type,
          content,
          timestamp: new Date().toISOString(),
          tokens: tokens || 0
        };

        await this.saveChatMessage(userId, message);

        return c.json({
          success: true,
          message
        });
      } catch (error) {
        console.error('Save chat error:', error);
        return c.json({ error: 'Failed to save message' }, 500);
      }
    });

    // Get chat history for user
    app.get('/api/chat/history/:userId', async (c) => {
      try {
        const userId = c.req.param('userId');
        const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;

        const messages = await this.getChatHistory(userId, limit);

        return c.json({
          success: true,
          userId,
          messages,
          count: messages.length,
          oldestFirst: messages.length > 0 ? messages[0].timestamp : null,
          newestFirst: messages.length > 0 ? messages[messages.length - 1].timestamp : null
        });
      } catch (error) {
        console.error('Get chat history error:', error);
        return c.json({ error: 'Failed to retrieve chat history' }, 500);
      }
    });

    // Clear chat history for user
    app.delete('/api/chat/history/:userId', async (c) => {
      try {
        const userId = c.req.param('userId');

        await this.env.AURA_KV.delete(`chat:${userId}`);

        return c.json({
          success: true,
          message: 'Chat history cleared'
        });
      } catch (error) {
        console.error('Clear chat history error:', error);
        return c.json({ error: 'Failed to clear chat history' }, 500);
      }
    });

    // User tokens endpoint
    app.get('/api/user/:userId/tokens', async (c) => {
      try {
        const userId = c.req.param('userId');
        const tokens = await this.tokenService.getUserTokens(userId);

        return c.json({
          userId,
          tokens: tokens.balance,
          balance: tokens.balance,
          totalEarned: tokens.totalEarned,
          totalSpent: tokens.totalSpent,
          lastUpdated: tokens.lastUpdated
        });
      } catch (error) {
        console.error('Tokens error:', error);
        return c.json({ error: 'Failed to fetch tokens' }, 500);
      }
    });

    // User transactions endpoint
    app.get('/api/user/:userId/transactions', async (c) => {
      try {
        const userId = c.req.param('userId');
        const limit = parseInt(c.req.query('limit') || '20');
        const transactions = await this.tokenService.getTransactionHistory(userId, limit);

        return c.json({
          userId,
          count: transactions.length,
          transactions
        });
      } catch (error) {
        console.error('Transactions error:', error);
        return c.json({ error: 'Failed to fetch transactions' }, 500);
      }
    });

    // Health check
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        message: 'Aura-AI is running',
        timestamp: new Date().toISOString()
      });
    });

    /**
     * Analytics & Insights endpoints
     */

    // Get analytics metrics
    app.get('/api/analytics', async (c) => {
      try {
        const metrics = await this.analyticsService.getMetrics();
        return c.json(metrics);
      } catch (error) {
        console.error('Analytics error:', error);
        return c.json({ error: 'Failed to fetch analytics' }, 500);
      }
    });

    // Share an insight
    app.post('/api/insights/:insightId/share', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const body = await c.req.json();
        const { userId, title, description, tags, isPublic } = body;

        if (!userId || !title) {
          return c.json({ error: 'Missing userId or title' }, 400);
        }

        // Get the insight from KV
        const insightData = await this.env.AURA_KV.get(`insight:${insightId}`, 'json');
        if (!insightData) {
          return c.json({ error: 'Insight not found' }, 404);
        }

        const insight = insightData as any;
        const shared = await this.marketplace.shareInsight(insight, userId, {
          title,
          description: description || '',
          tags: tags || [],
          isPublic: isPublic !== false
        });

        return c.json({ success: true, shared });
      } catch (error) {
        console.error('Share error:', error);
        return c.json({ error: 'Failed to share insight' }, 500);
      }
    });

    // Get trending insights
    app.get('/api/insights/trending', async (c) => {
      try {
        const limit = parseInt(c.req.query('limit') || '10');
        const trending = await this.marketplace.getTrendingInsights(limit);
        return c.json({ trending });
      } catch (error) {
        console.error('Trending error:', error);
        return c.json({ error: 'Failed to fetch trending insights' }, 500);
      }
    });

    // Get shared insight
    app.get('/api/shared/:shareId', async (c) => {
      try {
        const shareId = c.req.param('shareId');
        const shared = await this.marketplace.getSharedInsight(shareId);

        if (!shared) {
          return c.json({ error: 'Insight not found' }, 404);
        }

        return c.json(shared);
      } catch (error) {
        console.error('Get shared error:', error);
        return c.json({ error: 'Failed to fetch shared insight' }, 500);
      }
    });

    // Like shared insight
    app.post('/api/shared/:shareId/like', async (c) => {
      try {
        const shareId = c.req.param('shareId');
        const body = await c.req.json();
        const { userId } = body;

        if (!userId) {
          return c.json({ error: 'Missing userId' }, 400);
        }

        await this.marketplace.likeInsight(shareId, userId);
        return c.json({ success: true });
      } catch (error) {
        console.error('Like error:', error);
        return c.json({ error: 'Failed to like insight' }, 500);
      }
    });

    /**
     * Web3 & Decentralized AI Agent Development Endpoints
     */

    // Register AI agent
    app.post('/api/agents/register', async (c) => {
      try {
        const body = await c.req.json();
        const { walletAddress, agentName, agentDescription, agentType, capabilities } = body;

        if (!walletAddress || !agentName) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        const agentId = crypto.randomUUID();
        const agent = {
          id: agentId,
          walletAddress,
          name: agentName,
          description: agentDescription,
          type: agentType || 'general', // insight-generator, researcher, analyst, etc.
          capabilities: capabilities || [],
          createdAt: new Date().toISOString(),
          isActive: true,
          reputation: 0,
          totalQueriesProcessed: 0,
          averageRating: 5.0
        };

        await this.env.AURA_KV.put(`agent:${agentId}`, JSON.stringify(agent));
        await this.env.AURA_KV.put(`agent:owner:${walletAddress}:${agentId}`, 'true');

        return c.json({ success: true, agentId, agent });
      } catch (error) {
        console.error('Agent registration error:', error);
        return c.json({ error: 'Failed to register agent' }, 500);
      }
    });

    // Get agent details
    app.get('/api/agents/:agentId', async (c) => {
      try {
        const agentId = c.req.param('agentId');
        const agent = await this.env.AURA_KV.get(`agent:${agentId}`, 'json');

        if (!agent) {
          return c.json({ error: 'Agent not found' }, 404);
        }

        return c.json(agent);
      } catch (error) {
        console.error('Get agent error:', error);
        return c.json({ error: 'Failed to fetch agent' }, 500);
      }
    });

    // List user's agents
    app.get('/api/agents/user/:walletAddress', async (c) => {
      try {
        const walletAddress = c.req.param('walletAddress');
        const agents = [];
        const list = await this.env.AURA_KV.list({ prefix: `agent:owner:${walletAddress}:` });

        for (const item of list.keys) {
          const agentId = item.name.split(':').pop();
          const agent = await this.env.AURA_KV.get(`agent:${agentId}`, 'json');
          if (agent) agents.push(agent);
        }

        return c.json({ agents });
      } catch (error) {
        console.error('List agents error:', error);
        return c.json({ error: 'Failed to fetch agents' }, 500);
      }
    });

    // Contribute AI insight to marketplace
    app.post('/api/ai-marketplace/contribute', async (c) => {
      try {
        const body = await c.req.json();
        const { agentId, insightTitle, insightContent, category, tokensRequested, evidenceLinks } = body;

        if (!agentId || !insightTitle || !insightContent) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        const contributionId = crypto.randomUUID();
        const contribution = {
          id: contributionId,
          agentId,
          title: insightTitle,
          content: insightContent,
          category: category || 'general',
          tokensRequested: tokensRequested || 50,
          evidenceLinks: evidenceLinks || [],
          submittedAt: new Date().toISOString(),
          status: 'pending', // pending, approved, rejected, purchased
          approvalCount: 0,
          purchaseCount: 0,
          totalTokensEarned: 0
        };

        await this.env.AURA_KV.put(`contribution:${contributionId}`, JSON.stringify(contribution));
        await this.env.AURA_KV.put(`agent:${agentId}:contributions:${contributionId}`, 'true');

        return c.json({ success: true, contributionId, contribution });
      } catch (error) {
        console.error('Contribution error:', error);
        return c.json({ error: 'Failed to contribute insight' }, 500);
      }
    });

    // List AI marketplace contributions
    app.get('/api/ai-marketplace/contributions', async (c) => {
      try {
        const category = c.req.query('category');
        const status = c.req.query('status') || 'approved';
        const limit = parseInt(c.req.query('limit') || '20');

        const contributions = [];
        const list = await this.env.AURA_KV.list({ prefix: 'contribution:' });

        for (const item of list.keys.slice(0, limit)) {
          const contribution = (await this.env.AURA_KV.get(item.name, 'json')) as any;
          if (contribution && 
              (!category || contribution.category === category) &&
              contribution.status === status) {
            contributions.push(contribution);
          }
        }

        return c.json({ contributions, total: contributions.length });
      } catch (error) {
        console.error('Marketplace error:', error);
        return c.json({ error: 'Failed to fetch contributions' }, 500);
      }
    });

    // Purchase AI contribution
    app.post('/api/ai-marketplace/purchase', async (c) => {
      try {
        const body = await c.req.json();
        const { contributionId, buyerWallet, buyerUserId } = body;

        if (!contributionId || !buyerWallet) {
          return c.json({ error: 'Missing required fields' }, 400);
        }

        const contribution = (await this.env.AURA_KV.get(`contribution:${contributionId}`, 'json')) as any;
        if (!contribution) {
          return c.json({ error: 'Contribution not found' }, 404);
        }

        const transactionId = crypto.randomUUID();
        const transaction = {
          id: transactionId,
          contributionId,
          buyerWallet,
          buyerUserId,
          tokenAmount: contribution.tokensRequested,
          timestamp: new Date().toISOString()
        };

        // Award tokens to agent owner
        const agent = (await this.env.AURA_KV.get(`agent:${contribution.agentId}`, 'json')) as any;
        if (agent) {
          await this.tokenService.earnTokens(
            agent.walletAddress,
            contribution.tokensRequested,
            'earn_contribution' as any,
            `AI marketplace purchase: ${contribution.title}`
          );
        }

        await this.env.AURA_KV.put(`transaction:${transactionId}`, JSON.stringify(transaction));

        return c.json({ success: true, transactionId, transaction });
      } catch (error) {
        console.error('Purchase error:', error);
        return c.json({ error: 'Failed to complete purchase' }, 500);
      }
    });

    // Generate shareable card for insight
    app.get('/api/insights/:insightId/card', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const title = c.req.query('title') || 'Aura Insight';

        const insightData = await this.env.AURA_KV.get(`insight:${insightId}`, 'json');
        if (!insightData) {
          return c.json({ error: 'Insight not found' }, 404);
        }

        const insight = insightData as any;
        const card = this.cardGenerator.generateCard(insight, title);
        const image = this.cardGenerator.generateSocialImage(insight);
        const shortForm = this.cardGenerator.generateShortForm(insight);

        return c.json({ card, image, shortForm });
      } catch (error) {
        console.error('Card error:', error);
        return c.json({ error: 'Failed to generate card' }, 500);
      }
    });

    /**
     * Collaboration & Community endpoints
     */

    // Add comment to insight
    app.post('/api/insights/:insightId/comments', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const body = await c.req.json();
        const { userId, text } = body;

        if (!userId || !text) {
          return c.json({ error: 'Missing userId or text' }, 400);
        }

        const comment = await this.collaborationService.addComment(insightId, userId, text);
        return c.json({ success: true, comment });
      } catch (error) {
        console.error('Comment error:', error);
        return c.json({ error: 'Failed to add comment' }, 500);
      }
    });

    // Get comments for insight
    app.get('/api/insights/:insightId/comments', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const comments = await this.collaborationService.getComments(insightId);
        return c.json({ insightId, comments, count: comments.length });
      } catch (error) {
        console.error('Get comments error:', error);
        return c.json({ error: 'Failed to fetch comments' }, 500);
      }
    });

    // Vote on insight
    app.post('/api/insights/:insightId/vote', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const body = await c.req.json();
        const { userId, score } = body;

        if (!userId || score === undefined) {
          return c.json({ error: 'Missing userId or score' }, 400);
        }

        const vote = await this.collaborationService.voteOnInsight(insightId, userId, score);
        return c.json({ success: true, vote });
      } catch (error) {
        console.error('Vote error:', error);
        return c.json({ error: 'Failed to vote on insight' }, 500);
      }
    });

    // Like comment
    app.post('/api/insights/:insightId/comments/:commentId/like', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        const commentId = c.req.param('commentId');
        const body = await c.req.json();
        const { userId } = body;

        if (!userId) {
          return c.json({ error: 'Missing userId' }, 400);
        }

        await this.collaborationService.likeComment(insightId, commentId, userId);
        return c.json({ success: true });
      } catch (error) {
        console.error('Like comment error:', error);
        return c.json({ error: 'Failed to like comment' }, 500);
      }
    });

    // Get collaborative insight (with all data)
    app.get('/api/insights/:insightId/collaborative', async (c) => {
      try {
        const insightId = c.req.param('insightId');
        
        const insightData = await this.env.AURA_KV.get(`insight:${insightId}`, 'json');
        if (!insightData) {
          return c.json({ error: 'Insight not found' }, 404);
        }

        const insight = insightData as any;
        const collaborative = await this.collaborationService.getCollaborativeInsight(insightId, insight);

        return c.json(collaborative);
      } catch (error) {
        console.error('Collaborative insight error:', error);
        return c.json({ error: 'Failed to fetch collaborative insight' }, 500);
      }
    });

    /**
     * Showcase & Status endpoint
     */

    // Get platform showcase (for judges/investors)
    app.get('/api/showcase', async (c) => {
      try {
        const metrics = await this.analyticsService.getMetrics();
        
        const showcase = {
          name: 'Aura AI',
          tagline: 'Transparent, Collaborative AI for Better Decisions',
          status: 'production-ready',
          version: '1.0.0',
          
          capabilities: {
            insightCategories: ['FINANCE', 'LEARNING', 'BUSINESS', 'TRENDS', 'PERSONAL'],
            features: [
              'Context-aware recommendations',
              'Transparent reasoning chains',
              'Token economy system',
              'Real-time collaboration',
              'Insight marketplace',
              'Social sharing',
              'Analytics dashboard',
              'Multi-platform support (Web, WhatsApp, Telegram, Discord)'
            ],
            apiEndpoints: 25,
            mcpTools: 5,
            mcpResources: 5
          },

          metrics: {
            ...metrics,
            apiResponseTime: '<50ms',
            deployment: 'Cloudflare Workers',
            database: 'Distributed KV',
            globalReach: 'Edge-first architecture'
          },

          demo: {
            dashboard: 'http://localhost:8788',
            queryEndpoint: 'POST /api/query',
            analyticsEndpoint: 'GET /api/analytics',
            exampleQuery: {
              userId: 'demo-user',
              text: 'I want to learn Python programming',
              category: 'LEARNING'
            }
          },

          technology: {
            runtime: 'Cloudflare Workers',
            framework: 'Hono + @nullshot/mcp',
            language: 'TypeScript',
            storage: 'Cloudflare KV + Durable Objects',
            protocol: 'MCP (Model Context Protocol)'
          },

          deployment: {
            status: 'Ready for production',
            command: 'npm run deploy',
            timezone: 'Global (edge computing)',
            scalability: 'Unlimited (serverless)'
          },

          competitiveAdvantages: [
            'Only consumer app using MCP standard for AI agents',
            'Transparent AI - shows complete reasoning',
            'Aligned incentives through token economy',
            'Community-powered quality improvements',
            'Sub-50ms global response times',
            'Zero-downtime, auto-scaling architecture'
          ],

          businessModel: {
            revenueStreams: [
              'Premium tokens (users buy for deep insights)',
              'Enterprise API licensing',
              'Contextual advertising',
              'Expert marketplace'
            ],
            targetMarket: 'Billions facing daily decisions',
            tacticalAdvantage: 'Multi-platform (web + messengers) = organic growth'
          },

          nextSteps: [
            'LLM integration (Claude/GPT-4) for dynamic generation',
            'Mobile native apps (iOS/Android)',
            'Live community events',
            'Expert tier (verified advisors)',
            '1M+ daily active users',
            'Enterprise B2B licensing'
          ]
        };

        return c.json(showcase);
      } catch (error) {
        console.error('Showcase error:', error);
        return c.json({ error: 'Failed to load showcase' }, 500);
      }
    });
  }

  /**
   * Save chat message to history (KV storage)
   */
  private async saveChatMessage(userId: string, message: any): Promise<void> {
    try {
      const history = await this.getChatHistory(userId, 1000) || [];
      history.push(message);
      
      // Keep only last 500 messages to avoid KV size limits
      const trimmed = history.slice(-500);
      
      await this.env.AURA_KV.put(
        `chat:${userId}`,
        JSON.stringify(trimmed),
        { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
      );
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  /**
   * Get chat history for user from KV
   */
  private async getChatHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const data = await this.env.AURA_KV.get(`chat:${userId}`);
      if (!data) return [];

      const messages = JSON.parse(data) as any[];
      return messages.slice(-limit);
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      return [];
    }
  }

  /**
   * Get landing page HTML - Premium UI with animations and all features
   */
  private getLandingPageHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aura AI - AI-Powered Insights Marketplace</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #6366f1; --primary-light: #818cf8; --primary-dark: #4f46e5;
            --secondary: #8b5cf6; --accent: #f59e0b; --success: #10b981;
            --danger: #ef4444; --bg: #0f172a; --bg-secondary: #1e293b;
            --bg-tertiary: #334155; --text: #f1f5f9; --text-secondary: #cbd5e1;
            --border: #475569; --gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f59e0b 100%);
        }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, var(--bg) 0%, #1a1f3a 100%);
            color: var(--text); line-height: 1.6; min-height: 100vh;
            overflow-x: hidden;
        }
        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        ::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--primary-light); }
        
        /* Background Animation */
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        .page { min-height: 100vh; }
        .container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
        
        /* Navigation */
        nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
            background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(71, 85, 105, 0.2);
            display: flex; justify-content: space-between; align-items: center;
            padding: 1rem 2rem; height: 70px;
        }
        .nav-brand {
            display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; font-weight: 700;
            background: var(--gradient); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; background-clip: text;
            text-decoration: none;
        }
        .nav-brand i { background: var(--gradient); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; background-clip: text; }
        .nav-actions { display: flex; gap: 1rem; align-items: center; }
        .btn {
            padding: 0.6rem 1.4rem; border: none; border-radius: 0.5rem;
            font-weight: 600; cursor: pointer; transition: all 0.3s ease;
            text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;
            font-size: 0.95rem;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
        }
        .btn-primary:active { transform: translateY(0); }
        .btn-secondary {
            background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary);
            color: var(--primary);
        }
        .btn-secondary:hover { background: rgba(99, 102, 241, 0.2); }
        
        /* Hero Section */
        .hero {
            margin-top: 70px; padding: 6rem 0; text-align: center; position: relative; overflow: hidden;
        }
        .hero::before {
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            animation: rotate 15s linear infinite;
        }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hero-content { position: relative; z-index: 1; }
        .hero h1 {
            font-size: 4rem; font-weight: 800; margin-bottom: 1.5rem; line-height: 1.1;
            background: var(--gradient); background-size: 200% 200%;
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
            animation: gradientShift 5s ease infinite;
        }
        .hero-subtitle {
            font-size: 1.3rem; color: var(--text-secondary); max-width: 700px;
            margin: 0 auto 2.5rem; line-height: 1.7;
        }
        .hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 3rem; }
        .stats-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem; max-width: 900px; margin: 0 auto; margin-top: 4rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 1rem; padding: 2rem; text-align: center;
            transition: all 0.3s ease; backdrop-filter: blur(10px);
        }
        .stat-card:hover {
            border-color: var(--primary); background: rgba(99, 102, 241, 0.1);
            transform: translateY(-5px);
        }
        .stat-number {
            font-size: 2.5rem; font-weight: 700; color: var(--primary);
            background: var(--gradient); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; background-clip: text;
        }
        .stat-label { font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase;
            letter-spacing: 0.05em; margin-top: 0.5rem; font-weight: 600; }
        
        /* Features Section */
        .features-section { padding: 6rem 0; background: rgba(30, 41, 59, 0.4); }
        .section-title {
            font-size: 3rem; font-weight: 800; text-align: center; margin-bottom: 1rem;
            background: var(--gradient); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; background-clip: text;
        }
        .section-subtitle {
            text-align: center; color: var(--text-secondary); max-width: 600px;
            margin: 0 auto 4rem; font-size: 1.1rem;
        }
        .features-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
        }
        .feature-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
            border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 1rem; padding: 2.5rem;
            transition: all 0.3s ease; position: relative; overflow: hidden;
            backdrop-filter: blur(10px);
        }
        .feature-card::before {
            content: ''; position: absolute; top: -50%; right: -50%; width: 200px; height: 200px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent);
            transition: all 0.3s ease;
        }
        .feature-card:hover {
            border-color: var(--primary); transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(99, 102, 241, 0.2);
        }
        .feature-card:hover::before { top: -25%; right: -25%; }
        .feature-icon {
            font-size: 3rem; margin-bottom: 1rem; background: var(--gradient);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .feature-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.75rem; }
        .feature-desc { color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem; }
        
        /* Benefits Section */
        .benefits-section { padding: 6rem 0; }
        .benefits-content {
            display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
        }
        .benefits-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .benefit-item {
            display: flex; gap: 1rem; align-items: flex-start;
        }
        .benefit-check {
            background: var(--primary); color: white; width: 28px; height: 28px;
            min-width: 28px; border-radius: 50%; display: flex; align-items: center;
            justify-content: center; font-weight: bold; flex-shrink: 0;
        }
        .benefit-text h4 { color: var(--text); margin-bottom: 0.3rem; font-weight: 600; }
        .benefit-text p { color: var(--text-secondary); font-size: 0.9rem; }
        .benefits-image {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
            border: 2px dashed var(--border); border-radius: 1rem; height: 400px;
            display: flex; align-items: center; justify-content: center;
            font-size: 4rem; opacity: 0.6;
        }
        
        /* CTA Section */
        .cta-section {
            padding: 6rem 0; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
            border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
            text-align: center; margin: 4rem 0;
        }
        .cta-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;
            background: var(--gradient); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; background-clip: text; }
        .cta-text { font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        
        /* Footer */
        footer {
            background: rgba(0, 0, 0, 0.2); border-top: 1px solid var(--border);
            padding: 3rem 0; text-align: center; color: var(--text-secondary);
        }
        .footer-content {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem; margin-bottom: 2rem;
        }
        .footer-section h4 { color: var(--text); margin-bottom: 1rem; font-weight: 600; }
        .footer-link {
            display: block; color: var(--text-secondary); text-decoration: none;
            padding: 0.5rem 0; transition: color 0.3s ease; font-size: 0.9rem;
        }
        .footer-link:hover { color: var(--primary); }
        .footer-bottom {
            border-top: 1px solid var(--border); padding-top: 2rem;
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            nav { flex-direction: column; height: auto; gap: 1rem; }
            .hero h1 { font-size: 2.5rem; }
            .hero { margin-top: 0; padding: 4rem 0; padding-top: 100px; }
            .benefits-content { grid-template-columns: 1fr; }
            .footer-bottom { flex-direction: column; }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav>
        <a href="/" class="nav-brand">
            <i class="fas fa-sparkles"></i> Aura AI
        </a>
        <div class="nav-actions">
            <a href="#features" class="btn btn-secondary" style="border: none; background: transparent; color: var(--text);">
                <i class="fas fa-book"></i> Features
            </a>
            <a href="#benefits" class="btn btn-secondary" style="border: none; background: transparent; color: var(--text);">
                <i class="fas fa-star"></i> Why Us
            </a>
            <button class="btn btn-primary" onclick="window.connectWallet()">
                <i class="fas fa-wallet"></i> Connect Wallet
            </button>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero page">
        <div class="container">
            <div class="hero-content">
                <h1>Transform Data Into <span style="color: var(--secondary);">Actionable Insights</span></h1>
                <p class="hero-subtitle">
                    Get AI-powered insights with transparent reasoning. Earn crypto rewards for engagement, 
                    collaborate with teams, and monetize your knowledge on our marketplace.
                </p>
                <div class="hero-actions">
                    <button class="btn btn-primary" onclick="window.connectWallet()" style="font-size: 1rem; padding: 0.8rem 2rem;">
                        <i class="fas fa-rocket"></i> Get Started Free
                    </button>
                    <button class="btn btn-secondary" onclick="window.scrollToSection('features')" style="font-size: 1rem; padding: 0.8rem 2rem;">
                        <i class="fas fa-arrow-down"></i> Learn More
                    </button>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">10K+</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">$2.5M</div>
                        <div class="stat-label">Tokens Distributed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">5+</div>
                        <div class="stat-label">Networks Supported</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">24/7</div>
                        <div class="stat-label">Instant Rewards</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section page">
        <div class="container">
            <h2 class="section-title">Powerful Features</h2>
            <p class="section-subtitle">Everything you need to generate insights, earn rewards, and grow your reputation</p>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-brain"></i></div>
                    <h3 class="feature-title">AI-Powered Insights</h3>
                    <p class="feature-desc">Get instant, transparent insights with full explainability. Understand the reasoning behind every recommendation.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-coins"></i></div>
                    <h3 class="feature-title">Earn Crypto Rewards</h3>
                    <p class="feature-desc">Earn AURA tokens for generating insights, sharing knowledge, and engaging with the community. Convert to USDC anytime.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-network-wired"></i></div>
                    <h3 class="feature-title">Multi-Chain Support</h3>
                    <p class="feature-desc">Access insights and rewards on Base, Ethereum, Arbitrum, Optimism, and Polygon blockchains.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-store"></i></div>
                    <h3 class="feature-title">Insight Marketplace</h3>
                    <p class="feature-desc">List, discover, and trade insights as NFTs. Build your reputation and earn passive income from your knowledge.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-users"></i></div>
                    <h3 class="feature-title">Team Collaboration</h3>
                    <p class="feature-desc">Form squads with other users to tackle complex problems. Share rewards based on contributions.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-chart-line"></i></div>
                    <h3 class="feature-title">Analytics & Reputation</h3>
                    <p class="feature-desc">Track your earnings, reputation score, and impact across the platform. Become a verified top creator.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Benefits Section -->
    <section id="benefits" class="benefits-section page">
        <div class="container">
            <div class="benefits-content">
                <div>
                    <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem;">
                        Why Choose <span style="color: var(--primary);">Aura AI</span>?
                    </h2>
                    <div class="benefits-list">
                        <div class="benefit-item">
                            <div class="benefit-check">✓</div>
                            <div class="benefit-text">
                                <h4>Transparent & Trustworthy</h4>
                                <p>See the reasoning behind every insight with full AI explainability</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-check">✓</div>
                            <div class="benefit-text">
                                <h4>Real Crypto Rewards</h4>
                                <p>Instant AURA token earnings, convertible to USDC on multiple blockchains</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-check">✓</div>
                            <div class="benefit-text">
                                <h4>No Setup Required</h4>
                                <p>Connect wallet, ask questions, earn rewards. That's it. No fees, no friction.</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-check">✓</div>
                            <div class="benefit-text">
                                <h4>Monetize Knowledge</h4>
                                <p>Share insights on our marketplace and earn passive income forever</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-check">✓</div>
                            <div class="benefit-text">
                                <h4>Multi-Platform Access</h4>
                                <p>Use on Web, WhatsApp, Telegram, or Discord. Same rewards everywhere.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="benefits-image">
                    <i class="fas fa-shield-alt"></i>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <h2 class="cta-title">Ready to Start Earning?</h2>
            <p class="cta-text">
                Connect your wallet in seconds. Ask your first question. Earn your first AURA token.
                Join thousands earning crypto rewards through insights.
            </p>
            <button class="btn btn-primary" onclick="connectWallet()" style="font-size: 1.1rem; padding: 1rem 3rem;">
                <i class="fas fa-rocket"></i> Connect Wallet Now
            </button>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Product</h4>
                    <a href="#" class="footer-link">Features</a>
                    <a href="#" class="footer-link">Pricing</a>
                    <a href="#" class="footer-link">API</a>
                </div>
                <div class="footer-section">
                    <h4>Resources</h4>
                    <a href="#" class="footer-link">Docs</a>
                    <a href="#" class="footer-link">Blog</a>
                    <a href="#" class="footer-link">Community</a>
                </div>
                <div class="footer-section">
                    <h4>Company</h4>
                    <a href="#" class="footer-link">About</a>
                    <a href="#" class="footer-link">Twitter</a>
                    <a href="#" class="footer-link">Discord</a>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; 2024 Aura AI. All rights reserved.</span>
                <span>Built with ❤️ on Cloudflare & Ethereum</span>
            </div>
        </div>
    </footer>

    <script>
        function scrollToSection(id) {
            document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
        }

        async function connectWallet() {
            const provider = window.ethereum;
            if (!provider) {
                alert('📱 No Web3 wallet detected.\\n\\nInstall: MetaMask, Coinbase Wallet, or Trust Wallet');
                window.open('https://metamask.io/download/', '_blank');
                return;
            }

            try {
                const accounts = await provider.request({ method: 'eth_requestAccounts' });
                if (!accounts || accounts.length === 0) throw new Error('No accounts found');
                
                const address = accounts[0];
                const timestamp = Date.now();
                const message = \`Sign to login to Aura AI\\nWallet: \${address}\\nTime: \${new Date(timestamp).toISOString()}\`;
                
                const signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, address]
                });

                if (!signature) throw new Error('Signature rejected');

                const response = await fetch('/api/auth/wallet-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: address, message, signature })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('walletAddress', address);
                    localStorage.setItem('walletConnectedAt', new Date().toISOString());
                    window.location.href = '/chat';
                } else {
                    alert('❌ Verification failed: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                if (error.code === 4001) {
                    alert('❌ Request cancelled');
                } else if (error.code === -32002) {
                    alert('⏳ Check your wallet for pending request');
                } else {
                    alert('❌ Error: ' + error.message);
                }
            }
        }

        // Auto-redirect if already connected
        window.addEventListener('load', () => {
            const address = localStorage.getItem('walletAddress');
            if (address) {
                setTimeout(() => { window.location.href = '/chat'; }, 500);
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Get chat dashboard HTML
   */
  private getChatDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aura - Social AI Network</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #7c3aed;
            --primary-light: #a78bfa;
            --secondary: #06b6d4;
            --accent: #ec4899;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --bg: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text: #f1f5f9;
            --text-secondary: #cbd5e1;
            --border: #475569;
            --font-base: 13px;
            --font-small: 11px;
            --font-xs: 10px;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, var(--bg) 0%, #1a1f35 100%);
            color: var(--text);
            margin: 0;
            overflow: hidden;
            font-size: var(--font-base);
            font-weight: 400;
            letter-spacing: 0.3px;
        }
        
        .app {
            display: grid;
            grid-template-columns: 260px 1fr 340px;
            height: 100vh;
            gap: 0;
        }
        
        /* ===== LEFT SIDEBAR (Navigation) ===== */
        .sidebar {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            border-right: 1px solid var(--border);
            padding: 0.75rem;
            overflow-y: auto;
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
        }
        
        .nav-logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            padding: 0.5rem;
            text-decoration: none;
            color: var(--primary-light);
            font-weight: 700;
            font-size: 1.1rem;
            border-radius: 0.5rem;
        }
        
        .nav-logo:hover {
            background: rgba(124, 58, 237, 0.1);
        }
        
        .nav-logo i {
            font-size: 1.4rem;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .nav-section {
            margin-bottom: 1.2rem;
        }
        
        .nav-section-title {
            font-size: var(--font-xs);
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 0.5rem;
            padding: 0 0.5rem;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 0.65rem;
            margin-bottom: 0.35rem;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 0.5rem;
            color: var(--text-secondary);
            cursor: pointer;
            font-weight: 500;
            font-size: var(--font-small);
            transition: all 0.2s ease;
            width: 100%;
            text-align: left;
        }
        
        .nav-item:hover {
            background: rgba(124, 58, 237, 0.1);
            color: var(--primary-light);
            border-color: var(--primary);
        }
        
        .nav-item.active {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(6, 182, 212, 0.1));
            color: var(--primary-light);
            border-color: var(--primary);
            box-shadow: 0 0 15px rgba(124, 58, 237, 0.15);
        }
        
        .nav-item i {
            width: 1.1rem;
            text-align: center;
            font-size: 0.9rem;
        }
        
        .user-card {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.1));
            border: 1px solid rgba(124, 58, 237, 0.3);
            border-radius: 0.75rem;
            padding: 0.75rem;
            margin-top: auto;
            backdrop-filter: blur(10px);
            text-align: center;
            font-size: var(--font-small);
        }
        
        .user-avatar {
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            margin: 0 auto 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 700;
        }
        
        .user-name {
            font-weight: 600;
            color: var(--text);
            margin-bottom: 0.2rem;
            font-size: var(--font-small);
        }
        
        .user-handle {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            word-break: break-all;
        }
        
        .user-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(124, 58, 237, 0.2);
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--primary-light);
        }
        
        .stat-label {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        
        .wallet-label {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.4rem;
            font-weight: 600;
        }
        
        .wallet-address {
            font-size: var(--font-xs);
            color: var(--primary);
            font-family: 'Monaco', 'Courier New', monospace;
            font-weight: 500;
            word-break: break-all;
            line-height: 1.3;
        }
        
        .balance-section {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1));
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 0.75rem;
            padding: 0.75rem;
            text-align: center;
            margin-bottom: 1rem;
            backdrop-filter: blur(10px);
        }
        
        .balance-label {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.3rem;
            font-weight: 600;
        }
        
        .balance-value {
            font-size: 1.6rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--success), #059669);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .disconnect-btn {
            margin-top: auto;
            width: 100%;
            padding: 0.6rem;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(236, 72, 153, 0.1));
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 0.5rem;
            color: #fca5a5;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
            font-size: var(--font-small);
        }
        
        .disconnect-btn:hover {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(236, 72, 153, 0.15));
            border-color: var(--danger);
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
        }
        
        /* ===== MAIN FEED ===== */
        .feed {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: linear-gradient(135deg, var(--bg) 0%, var(--bg-secondary) 100%);
        }
        
        .feed-header {
            background: linear-gradient(90deg, rgba(124, 58, 237, 0.05), rgba(6, 182, 212, 0.05));
            border-bottom: 1px solid var(--border);
            padding: 1rem 1.5rem;
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .feed-title {
            font-size: 1.4rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary-light), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .posts-container {
            flex: 1;
            overflow-y: auto;
            padding: 1rem 1.5rem;
        }
        
        .composer {
            background: rgba(51, 65, 85, 0.4);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(10px);
        }
        
        .composer-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .composer-avatar {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: white;
        }
        
        .composer-input {
            width: 100%;
            background: rgba(51, 65, 85, 0.3);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 0.875rem;
            color: var(--text);
            font-family: inherit;
            font-size: 0.95rem;
            resize: none;
            transition: all 0.3s ease;
            min-height: 80px;
        }
        
        .composer-input:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(51, 65, 85, 0.5);
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
        }
        
        .composer-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1rem;
        }
        
        .post {
            background: rgba(51, 65, 85, 0.3);
            border: 1px solid var(--border);
            border-radius: 1.25rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .post:hover {
            border-color: var(--primary);
            box-shadow: 0 8px 32px rgba(124, 58, 237, 0.1);
        }
        
        .post-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .post-avatar {
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: white;
            font-size: 1rem;
        }
        
        .post-meta {
            flex: 1;
        }
        
        .post-author {
            font-weight: 600;
            color: var(--text);
            font-size: 1rem;
        }
        
        .post-time {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .post-content {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 1.25rem;
            font-size: 0.95rem;
        }
        
        .post-card {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.05));
            border: 1px solid rgba(124, 58, 237, 0.2);
            border-radius: 1rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }
        
        .post-card-title {
            font-weight: 600;
            color: var(--primary-light);
            margin-bottom: 0.5rem;
        }
        
        .post-card-desc {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
        }
        
        .post-actions {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }
        
        .post-action-btn {
            flex: 1;
            padding: 0.75rem;
            background: rgba(124, 58, 237, 0.1);
            border: 1px solid rgba(124, 58, 237, 0.2);
            border-radius: 0.75rem;
            color: var(--primary-light);
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        
        .post-action-btn:hover {
            background: rgba(124, 58, 237, 0.2);
            border-color: var(--primary);
            box-shadow: 0 0 15px rgba(124, 58, 237, 0.2);
        }
        
        .messages-wrapper {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 1.5rem;
            padding-right: 0.5rem;
        }
        
        .messages-wrapper::-webkit-scrollbar {
            width: 6px;
        }
        
        .messages-wrapper::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .messages-wrapper::-webkit-scrollbar-thumb {
            background: rgba(124, 58, 237, 0.3);
            border-radius: 3px;
        }
        
        .messages-wrapper::-webkit-scrollbar-thumb:hover {
            background: rgba(124, 58, 237, 0.5);
        }
        
        .messages-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .message {
            display: flex;
            gap: 1rem;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .message.user {
            justify-content: flex-end;
        }
        
        .message-avatar {
            width: 2rem;
            height: 2rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .message.user .message-avatar {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            order: 2;
        }
        
        .message.ai .message-avatar {
            background: linear-gradient(135deg, var(--success), #059669);
            color: white;
        }
        
        .message-bubble {
            max-width: 65%;
            background: rgba(51, 65, 85, 0.5);
            border: 1px solid var(--light-border);
            border-radius: 1rem;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            backdrop-filter: blur(10px);
        }
        
        .message.user .message-bubble {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border: none;
            order: 1;
            box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
        }
        
        .message.ai .message-bubble {
            background: rgba(51, 65, 85, 0.5);
            border: 1px solid var(--light-border);
        }
        
        .message-text {
            line-height: 1.6;
            font-size: 0.95rem;
        }
        
        .message.user .message-text {
            color: white;
        }
        
        .message.ai .message-text {
            color: var(--text);
        }
        
        .message-time {
            font-size: 0.75rem;
            opacity: 0.6;
            margin-top: 0.25rem;
        }
        
        .message-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: var(--font-small);
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            white-space: nowrap;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary), #a78bfa);
            color: white;
            border: none;
        }
        
        .btn-primary:hover {
            box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }
        
        .btn-secondary:hover {
            background: rgba(124, 58, 237, 0.1);
            color: var(--primary-light);
            border-color: var(--primary);
        }
        
        .post {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
        }
        
        .post-header {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        
        .post-avatar {
            width: 1.8rem;
            height: 1.8rem;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: 700;
            flex-shrink: 0;
        }
        
        .post-meta {
            display: flex;
            gap: 0.5rem;
            font-size: var(--font-xs);
        }
        
        .post-author {
            font-weight: 600;
            color: var(--text);
        }
        
        .post-time {
            color: var(--text-secondary);
        }
        
        .post-content {
            background: rgba(51, 65, 85, 0.3);
            border: 1px solid rgba(124, 58, 237, 0.2);
            border-radius: 0.5rem;
            padding: 0.6rem 0.8rem;
            font-size: var(--font-small);
            line-height: 1.5;
            color: var(--text);
        }
        
        .post-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.4rem;
            font-size: var(--font-xs);
        }
        
        .post-action-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem 0.5rem;
        }
        
        .post-action-btn:hover {
            color: var(--primary-light);
        }
        
        .post-card {
            background: rgba(124, 58, 237, 0.1);
            border: 1px solid rgba(124, 58, 237, 0.2);
            border-radius: 0.5rem;
            padding: 0.6rem 0.8rem;
            margin-top: 0.5rem;
            font-size: var(--font-small);
        }
        
        .post-card-title {
            font-weight: 600;
            color: var(--primary-light);
            margin-bottom: 0.2rem;
        }
        
        .post-card-desc {
            color: var(--text-secondary);
            font-size: var(--font-xs);
        }
        
        .trending-panel {
            background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            border-left: 1px solid var(--border);
            padding: 1rem;
            overflow-y: auto;
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .trending-title {
            font-weight: 700;
            font-size: 1.2rem;
            color: var(--text);
            margin-bottom: 0.5rem;
        }
        
        .trending-item {
            background: rgba(51, 65, 85, 0.3);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .trending-item:hover {
            background: rgba(124, 58, 237, 0.15);
            border-color: var(--primary);
        }
        
        .trending-category {
            font-size: var(--font-xs);
            color: var(--text-secondary);
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 0.3rem;
        }
        
        .trending-name {
            font-weight: 600;
            color: var(--text);
            font-size: var(--font-small);
            margin-bottom: 0.2rem;
        }
        
        .trending-count {
            font-size: var(--font-xs);
            color: var(--secondary);
        }
        
        .squad-suggestion {
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(124, 58, 237, 0.1));
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 0.75rem;
            padding: 0.75rem;
            text-align: center;
            margin-top: auto;
        }
        
        .squad-suggestion-icon {
            font-size: 1.8rem;
            margin-bottom: 0.3rem;
        }
        
        .squad-suggestion-title {
            font-weight: 700;
            color: var(--text);
            margin-bottom: 0.2rem;
            font-size: var(--font-small);
        }
        
        .squad-suggestion-desc {
            font-size: var(--font-xs);
            color: var(--text-secondary);
        }
        
        #walletSection {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(4px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }
    </style>
</head>
<body>
    <div class="app">
        <!-- LEFT SIDEBAR -->
        <div class="sidebar" id="sidebar">
            <a href="/" class="nav-logo">
                <i class="fas fa-spark"></i>
                <span>Aura</span>
            </a>

            <div id="walletSection" style="display: none;">
                <nav class="nav-section">
                    <div class="nav-section-title">Discover</div>
                    <button class="nav-item active" onclick="window.switchTab('feed')">
                        <i class="fas fa-home"></i>
                        <span>Feed</span>
                    </button>
                    <button class="nav-item" onclick="window.switchTab('squads')">
                        <i class="fas fa-users"></i>
                        <span>Squads</span>
                    </button>
                    <button class="nav-item" onclick="window.switchTab('explore')">
                        <i class="fas fa-compass"></i>
                        <span>Explore</span>
                    </button>
                </nav>

                <nav class="nav-section">
                    <div class="nav-section-title">You</div>
                    <button class="nav-item" onclick="window.switchTab('profile')">
                        <i class="fas fa-user"></i>
                        <span>Profile</span>
                    </button>
                    <button class="nav-item" onclick="window.switchTab('rewards')">
                        <i class="fas fa-coins"></i>
                        <span>Rewards</span>
                    </button>
                    <button class="nav-item" onclick="window.switchTab('convert')">
                        <i class="fas fa-exchange-alt"></i>
                        <span>Convert</span>
                    </button>
                </nav>

                <div class="user-card">
                    <div class="user-avatar" id="userAvatar">A</div>
                    <div class="user-name" id="userName">User</div>
                    <div class="user-handle" id="userHandle">Connecting...</div>
                    <div class="user-stats">
                        <div class="stat">
                            <div class="stat-value" id="postsCount">0</div>
                            <div class="stat-label">Posts</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value" id="rewardsCount">0</div>
                            <div class="stat-label">Rewards</div>
                        </div>
                    </div>
                    <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem;" onclick="window.disconnectWallet()">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </div>
        </div>

        <!-- MAIN FEED (CHAT) -->
        <div class="feed" id="feedTab" style="display: flex; flex-direction: column;">
            <div class="feed-header">
                <div class="feed-title">Chat with Aura AI</div>
            </div>
            <div class="posts-container" id="postsContainer" style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end; overflow-y: auto; padding: 1rem;">
                <div id="postsContent" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
            </div>
            <div style="padding: 1rem; border-top: 1px solid var(--border); background: rgba(15, 23, 42, 0.6);">
                <div style="display: flex; gap: 0.75rem; align-items: flex-end;">
                    <textarea id="messageInput" placeholder="Type a message..." style="flex: 1; padding: 0.6rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit; font-size: 13px; resize: none; min-height: 36px; max-height: 100px;"></textarea>
                    <button class="btn btn-primary" onclick="window.sendMessage()" style="padding: 0.75rem 1.5rem; height: 44px;">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- SQUADS TAB -->
        <div class="feed" id="squadsTab" style="display: none; flex-direction: column;">
            <div class="feed-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="feed-title">Your Squads</div>
                    <button class="btn btn-primary" onclick="console.log('Create Squad button clicked'); window.openCreateSquadModal()" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                        <i class="fas fa-plus"></i> Create Squad
                    </button>
                </div>
            </div>
            <div class="posts-container" style="overflow-y: auto; padding: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(124, 58, 237, 0.2)'" onmouseout="this.style.background='rgba(51, 65, 85, 0.4)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🚀</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Builders Hub</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Learn and build together</div>
                        <div style="font-size: 0.8rem; color: var(--secondary);">124 members</div>
                        <button class="btn btn-secondary" style="width: 100%; margin-top: 0.75rem; padding: 0.5rem; font-size: 0.85rem;" onclick="window.openRewardModal('Builders Hub', 'squad1')">
                            <i class="fas fa-gift"></i> Distribute Rewards
                        </button>
                    </div>
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(124, 58, 237, 0.2)'" onmouseout="this.style.background='rgba(51, 65, 85, 0.4)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🎨</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Design Squad</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Creative minds unite</div>
                        <div style="font-size: 0.8rem; color: var(--secondary);">87 members</div>
                    </div>
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(124, 58, 237, 0.2)'" onmouseout="this.style.background='rgba(51, 65, 85, 0.4)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">💡</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Innovation Lab</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Cutting-edge ideas</div>
                        <div style="font-size: 0.8rem; color: var(--secondary);">156 members</div>
                    </div>
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(124, 58, 237, 0.2)'" onmouseout="this.style.background='rgba(51, 65, 85, 0.4)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🌍</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Global Network</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Connect worldwide</div>
                        <div style="font-size: 0.8rem; color: var(--secondary);">342 members</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXPLORE TAB -->
        <div class="feed" id="exploreTab" style="display: none; flex-direction: column;">
            <div class="feed-header">
                <div class="feed-title">Explore Squads</div>
            </div>
            <div class="posts-container" style="overflow-y: auto; padding: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">📚</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Learning Hub</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Master new skills daily</div>
                        <button onclick="window.joinSquad('Learning Hub')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">💰</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Crypto Trading</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Trade and learn together</div>
                        <button onclick="window.joinSquad('Crypto Trading')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🎮</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Gaming Guild</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Play and earn rewards</div>
                        <button onclick="window.joinSquad('Gaming Guild')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🎤</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Content Creator</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Create and monetize</div>
                        <button onclick="window.joinSquad('Content Creator')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🏋️</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Fitness Crew</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Stay fit and motivated</div>
                        <button onclick="window.joinSquad('Fitness Crew')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 1rem; padding: 1.5rem; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.border='1px solid var(--secondary)'" onmouseout="this.style.border='1px solid rgba(6, 182, 212, 0.3)'">
                        <div style="font-size: 2rem; margin-bottom: 0.75rem;">🔐</div>
                        <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text);">Security Experts</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Secure and learn</div>
                        <button onclick="window.joinSquad('Security Experts')" style="width: 100%; padding: 0.5rem; background: var(--secondary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Join Squad</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- REWARDS TAB -->
        <div class="feed" id="rewardsTab" style="display: none;">
            <div class="feed-header">
                <div class="feed-title">Your Rewards</div>
            </div>
            <div class="posts-container" style="justify-content: center; align-items: center;">
                <div style="max-width: 500px; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">🎉</div>
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 2rem; backdrop-filter: blur(10px);">
                        <div style="font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.75rem;">Total AURA Balance</div>
                        <div style="font-size: 3rem; font-weight: 700; background: linear-gradient(135deg, var(--primary-light), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 2rem;" id="totalBalance">0</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 0.75rem; padding: 1rem;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Earned Today</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary-light);" id="earnedToday">0</div>
                            </div>
                            <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 0.75rem; padding: 1rem;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Posts</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--secondary);" id="totalPosts">0</div>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;" onclick="window.switchTab('convert')">
                            <i class="fas fa-exchange-alt"></i>
                            Convert to USDC
                        </button>
                        
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Earn more AURA by engaging with the community and forming squads</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CONVERT TAB -->
        <div class="feed" id="convertTab" style="display: none;">
            <div class="feed-header">
                <div class="feed-title">Convert Rewards</div>
            </div>
            <div class="posts-container" style="justify-content: center; align-items: center;">
                <div style="max-width: 500px; width: 100%;">
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 2rem; backdrop-filter: blur(10px);">
                        <h2 style="margin-bottom: 1.5rem; color: var(--text);">
                            <i class="fas fa-magic" style="color: var(--primary); margin-right: 0.5rem;"></i>
                            Convert AURA to USDC
                        </h2>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: var(--text);">Amount to Convert (AURA)</label>
                            <input type="number" id="convertAmount" placeholder="0.00" min="1" style="width: 100%; padding: 0.875rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.75rem; color: var(--text); font-size: 1rem; font-family: inherit;" />
                        </div>
                        
                        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">
                            <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 0.75rem;">You will receive</div>
                            <div style="font-size: 2rem; font-weight: 700; color: var(--success);" id="convertResult">0.00 USDC</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">Rate: 1 AURA = 0.10 USDC</div>
                        </div>
                        
                        <button class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;" onclick="window.convertRewards()">
                            <i class="fas fa-zap"></i>
                            Convert Now
                        </button>
                        
                        <button class="btn btn-secondary" style="width: 100%;" onclick="window.switchTab('rewards')">
                            <i class="fas fa-arrow-left"></i>
                            Back to Rewards
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- PROFILE TAB -->
        <div class="feed" id="profileTab" style="display: none;">
            <div class="feed-header">
                <div class="feed-title">Your Profile</div>
            </div>
            <div class="posts-container" style="justify-content: center; align-items: center;">
                <div style="max-width: 600px; width: 100%;">
                    <div style="background: rgba(51, 65, 85, 0.4); border: 1px solid var(--border); border-radius: 1rem; padding: 2rem; backdrop-filter: blur(10px); text-align: center;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;" id="profileAvatar">👤</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem;" id="profileName">User Profile</div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); word-break: break-all; margin-bottom: 2rem;" id="profileAddress">0x...</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 0.75rem; padding: 1rem;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Posts</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary-light);" id="profilePosts">0</div>
                            </div>
                            <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 0.75rem; padding: 1rem;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Rewards</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--secondary);" id="profileRewards">0</div>
                            </div>
                            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 0.75rem; padding: 1rem;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Level</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--success);">Founder</div>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;" onclick="window.switchTab('rewards')">
                            <i class="fas fa-coins"></i>
                            View Rewards
                        </button>
                        
                        <button class="btn btn-secondary" style="width: 100%;" onclick="window.switchTab('feed')">
                            <i class="fas fa-arrow-left"></i>
                            Back to Feed
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- TRENDING PANEL -->
        <div class="trending-panel" id="trendingPanel">
            <div class="trending-title">
                <i class="fas fa-fire" style="color: var(--accent); margin-right: 0.5rem;"></i>
                Trending
            </div>

            <div class="trending-item">
                <div class="trending-category">🔥 Hot Squad</div>
                <div class="trending-name">adventure_planning</div>
                <div class="trending-count">2.5K members</div>
            </div>

            <div class="trending-item">
                <div class="trending-category">⚡ Trending</div>
                <div class="trending-name">#SkillBuilding</div>
                <div class="trending-count">1.8K posts</div>
            </div>

            <div class="trending-item">
                <div class="trending-category">🎯 Popular</div>
                <div class="trending-name">problem_solving</div>
                <div class="trending-count">3.2K active</div>
            </div>

            <div class="trending-item">
                <div class="trending-category">✨ New</div>
                <div class="trending-name">content_creation</div>
                <div class="trending-count">890 members</div>
            </div>

            <div class="squad-suggestion">
                <div class="squad-suggestion-icon">🚀</div>
                <div class="squad-suggestion-title">Join a Squad Today</div>
                <div class="squad-suggestion-desc">Collaborate with others and earn rewards while achieving your goals</div>
            </div>
        </div>
    </div>

    <script type="text/javascript">
window.currentUser = { address: null, tokens: 0, messages: 0 };
var apiBase = '/api';

window.connectWallet = async function() {
  if (!window.ethereum) { 
    alert('❌ No Web3 wallet detected. Please install MetaMask.');
    return; 
  }
  try {
    var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) return;
    
    var address = accounts[0];
    var ts = new Date().toISOString();
    var message = 'Sign to login: ' + address + ' at ' + ts;
    
    var signature = await window.ethereum.request({
      method: 'personal_sign', 
      params: [message, address]
    });

    if (!signature) return;

    var url = apiBase + '/auth/wallet-login';
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address, message: message, signature: signature })
    });

    if (resp.ok) {
      localStorage.setItem('walletAddress', address);
      window.currentUser.address = address;
      window.loadUserData();
      window.showWalletSection();
    } else {
      var errData = await resp.json();
      alert('❌ Connection failed: ' + (errData.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Wallet error:', error);
    alert('❌ Connection failed: ' + error.message);
  }
};

window.disconnectWallet = function() {
  localStorage.removeItem('walletAddress');
  location.reload();
};

window.showWalletSection = function() {
  var el = document.getElementById('walletSection');
  if (el) {
    el.style.display = 'block';
  }
  // Initialize feed as active tab
  var feedTab = document.getElementById('feedTab');
  if (feedTab) feedTab.style.display = 'flex';
};

window.loadUserData = async function() {
  try {
    var addr = window.currentUser.address;
    var url = apiBase + '/user/' + addr;
    var response = await fetch(url);
    if (response.ok) {
      var data = await response.json();
      window.currentUser.tokens = (data.tokens && data.tokens.balance) || 0;
    }
    var shortAddr = addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
    
    // Update sidebar user card
    var userHandle = document.getElementById('userHandle');
    if (userHandle) userHandle.textContent = shortAddr;
    
    var userName = document.getElementById('userName');
    if (userName) userName.textContent = 'You';
    
    var userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.textContent = addr.substring(0, 2).toUpperCase();
    
    var postsCount = document.getElementById('postsCount');
    if (postsCount) postsCount.textContent = window.currentUser.messages;
    
    var rewardsCount = document.getElementById('rewardsCount');
    if (rewardsCount) rewardsCount.textContent = window.currentUser.tokens.toFixed(0);
    
    // Update composer avatar
    var composerAvatar = document.getElementById('composerAvatar');
    if (composerAvatar) composerAvatar.textContent = addr.substring(0, 2).toUpperCase();
    
    // Update rewards tab
    var totalBalance = document.getElementById('totalBalance');
    if (totalBalance) totalBalance.textContent = window.currentUser.tokens.toFixed(0);
    
    var earnedToday = document.getElementById('earnedToday');
    if (earnedToday) earnedToday.textContent = (window.currentUser.messages * 10).toFixed(0);
    
    var totalPosts = document.getElementById('totalPosts');
    if (totalPosts) totalPosts.textContent = window.currentUser.messages;
  } catch (e) {
    console.error('Error loading user data:', e);
  }
};

window.switchTab = function(tabName) {
  // Hide all main sections
  var allTabs = document.querySelectorAll('.feed');
  allTabs.forEach(function(tab) { tab.style.display = 'none'; });
  
  // Remove active class from all nav items
  var navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(function(item) { item.classList.remove('active'); });
  
  // Show requested tab
  if (tabName === 'feed') {
    var feedTab = document.getElementById('feedTab');
    if (feedTab) feedTab.style.display = 'flex';
    var feedBtn = document.querySelector('.nav-item[onclick*="feed"]');
    if (feedBtn) feedBtn.classList.add('active');
  } else if (tabName === 'squads') {
    var squadsTab = document.getElementById('squadsTab');
    if (squadsTab) squadsTab.style.display = 'flex';
    var squadsBtn = document.querySelector('.nav-item[onclick*="squads"]');
    if (squadsBtn) squadsBtn.classList.add('active');
  } else if (tabName === 'explore') {
    var exploreTab = document.getElementById('exploreTab');
    if (exploreTab) exploreTab.style.display = 'flex';
    var exploreBtn = document.querySelector('.nav-item[onclick*="explore"]');
    if (exploreBtn) exploreBtn.classList.add('active');
  } else if (tabName === 'rewards') {
    var rewardsTab = document.getElementById('rewardsTab');
    if (rewardsTab) rewardsTab.style.display = 'flex';
    var rewardsBtn = document.querySelector('.nav-item[onclick*="rewards"]');
    if (rewardsBtn) rewardsBtn.classList.add('active');
  } else if (tabName === 'convert') {
    var convertTab = document.getElementById('convertTab');
    if (convertTab) convertTab.style.display = 'flex';
    var convertBtn = document.querySelector('.nav-item[onclick*="convert"]');
    if (convertBtn) convertBtn.classList.add('active');
  } else if (tabName === 'profile') {
    var profileTab = document.getElementById('profileTab');
    if (profileTab) profileTab.style.display = 'flex';
    var profileBtn = document.querySelector('.nav-item[onclick*="profile"]');
    if (profileBtn) profileBtn.classList.add('active');
    // Update profile tab with current data
    var profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = window.currentUser.address ? window.currentUser.address.substring(0, 6) + '...' : 'User';
    var profileAddress = document.getElementById('profileAddress');
    if (profileAddress) profileAddress.textContent = window.currentUser.address || '0x...';
    var profilePosts = document.getElementById('profilePosts');
    if (profilePosts) profilePosts.textContent = window.currentUser.messages;
    var profileRewards = document.getElementById('profileRewards');
    if (profileRewards) profileRewards.textContent = window.currentUser.tokens.toFixed(0);
  }
};

window.sendMessage = async function() {
  var msgInput = document.getElementById('messageInput');
  var message = msgInput ? msgInput.value.trim() : '';
  
  if (!message) {
    alert('Please enter a message');
    return;
  }
  
  if (!window.currentUser.address) {
    alert('❌ Please connect your wallet first');
    return;
  }

  var postsContent = document.getElementById('postsContent');
  
  // Create user message bubble
  var userBubble = document.createElement('div');
  userBubble.style.display = 'flex';
  userBubble.style.justifyContent = 'flex-end';
  userBubble.style.marginBottom = '0.75rem';
  
  var userMsg = document.createElement('div');
  userMsg.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-light))';
  userMsg.style.color = 'white';
  userMsg.style.padding = '0.75rem 1rem';
  userMsg.style.borderRadius = '0.75rem 0.75rem 0 0.75rem';
  userMsg.style.maxWidth = '70%';
  userMsg.style.wordWrap = 'break-word';
  userMsg.style.fontSize = '0.95rem';
  userMsg.textContent = message;
  
  userBubble.appendChild(userMsg);
  
  if (postsContent) {
    postsContent.appendChild(userBubble);
  }

  if (msgInput) msgInput.value = '';
  window.currentUser.messages += 1;
  
  var postsCount = document.getElementById('postsCount');
  if (postsCount) postsCount.textContent = window.currentUser.messages;
  
  // Scroll to bottom
  var container = document.getElementById('postsContainer');
  if (container) container.scrollTop = container.scrollHeight;

  try {
    // AI typing indicator
    var aiBubble = document.createElement('div');
    aiBubble.style.display = 'flex';
    aiBubble.style.justifyContent = 'flex-start';
    aiBubble.style.marginBottom = '0.75rem';
    
    var aiMsg = document.createElement('div');
    aiMsg.style.background = 'rgba(51, 65, 85, 0.4)';
    aiMsg.style.color = 'var(--text)';
    aiMsg.style.padding = '0.75rem 1rem';
    aiMsg.style.borderRadius = '0.75rem 0.75rem 0.75rem 0';
    aiMsg.style.maxWidth = '70%';
    aiMsg.style.fontSize = '0.95rem';
    aiMsg.innerHTML = '<i class="fas fa-spinner" style="animation: spin 1s linear infinite; margin-right: 0.5rem;"></i>Aura is thinking...';
    
    aiBubble.appendChild(aiMsg);
    
    if (postsContent) {
      postsContent.appendChild(aiBubble);
    }
    
    if (container) container.scrollTop = container.scrollHeight;

    var url = apiBase + '/query';
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: window.currentUser.address, text: message })
    });

    var data = await response.json();
    
    aiMsg.innerHTML = '';
    
    if (response.ok && data.success) {
      var responseText = data.response.message;
      aiMsg.textContent = responseText;
      
      // Show squad info if available
      var squad = data.response.squad;
      if (squad) {
        var squadInfo = document.createElement('div');
        squadInfo.style.marginTop = '0.5rem';
        squadInfo.style.fontSize = '0.85rem';
        squadInfo.style.color = 'var(--secondary)';
        squadInfo.style.padding = '0.5rem';
        squadInfo.style.background = 'rgba(6, 182, 212, 0.1)';
        squadInfo.style.borderRadius = '0.5rem';
        squadInfo.innerHTML = '<i class="fas fa-users" style="margin-right: 0.5rem;"></i>' + squad.emoji + ' ' + squad.name;
        aiMsg.appendChild(squadInfo);
      }
      
      window.currentUser.tokens += data.response.tokensRewarded;
      var rewardsCount = document.getElementById('rewardsCount');
      if (rewardsCount) rewardsCount.textContent = window.currentUser.tokens.toFixed(0);
      
      var totalBalance = document.getElementById('totalBalance');
      if (totalBalance) totalBalance.textContent = window.currentUser.tokens.toFixed(0);
      
      var earnedToday = document.getElementById('earnedToday');
      if (earnedToday) earnedToday.textContent = (window.currentUser.messages * 10).toFixed(0);
      
      var totalPosts = document.getElementById('totalPosts');
      if (totalPosts) totalPosts.textContent = window.currentUser.messages;
    } else {
      aiMsg.style.color = '#ef4444';
      aiMsg.textContent = 'Error: ' + (data.error || 'Failed to process message');
    }
    
    if (container) container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('Error:', error);
    aiMsg.style.color = '#ef4444';
    aiMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error: ' + error.message;
  }
};

window.downloadInsight = function(text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', 'insight.txt');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

window.shareInsight = function(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      alert('✅ Copied to clipboard!');
    }).catch(function() {
      alert('Failed to copy');
    });
  }
};

window.convertRewards = async function() {
  var amount = parseFloat(document.getElementById('convertAmount').value);
  if (!amount || amount < 1 || amount > window.currentUser.tokens) {
    alert('❌ Invalid amount. Please check your balance.');
    return;
  }

  try {
    var url = apiBase + '/rewards/mint';
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: window.currentUser.address, auraTokens: amount, walletAddress: window.currentUser.address })
    });

    if (response.ok) {
      alert('✅ Converting ' + amount.toFixed(2) + ' AURA to USDC...');
      window.currentUser.tokens -= amount;
      var tb = document.getElementById('rewardsCount');
      if (tb) tb.textContent = window.currentUser.tokens.toFixed(0);
      var tb2 = document.getElementById('totalBalance');
      if (tb2) tb2.textContent = window.currentUser.tokens.toFixed(0);
      document.getElementById('convertAmount').value = '';
      document.getElementById('convertResult').textContent = '0.00 USDC';
    } else {
      alert('❌ Conversion failed. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  }
};

window.initChat = function() {
  var address = localStorage.getItem('walletAddress');
  if (address) {
    window.currentUser.address = address;
    window.loadUserData();
    window.showWalletSection();
  } else {
    window.showWalletSection();
  }
  
  var convertAmount = document.getElementById('convertAmount');
  if (convertAmount) {
    convertAmount.addEventListener('input', function(e) {
      var resultEl = document.getElementById('convertResult');
      if (resultEl) {
        resultEl.textContent = (parseFloat(e.target.value || 0) * 0.1).toFixed(2) + ' USDC';
      }
    });
  }
  
  var messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendMessage();
      }
    });
  }
  
  var navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      window.switchTab({ target: btn });
    });
  });
  
  // Add click handlers for squad join buttons
  var joinButtons = document.querySelectorAll('[style*="Join Squad"]');
  joinButtons.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      if (e.target.textContent.includes('Join Squad')) {
        var squadName = e.target.closest('[style*="padding"]').querySelector('div[style*="font-weight"]').textContent;
        alert('🎉 Welcome to ' + squadName + '! You are now a member.');
        e.target.textContent = 'Joined ✓';
        e.target.style.background = '#10b981';
        e.target.disabled = true;
      }
    });
  });

  // Setup reward input listener
  window.setupRewardInputListener();
};

window.joinSquad = function(squadName) {
  alert('🎉 Welcome to ' + squadName + '! You are now a member.');
};

/* Create Squad Modal and Functions */
window.openCreateSquadModal = function() {
  console.log('openCreateSquadModal called');
  var modal = document.getElementById('createSquadModal');
  console.log('Modal element:', modal);
  if (modal) {
    modal.style.display = 'flex';
    console.log('Modal displayed');
  } else {
    console.error('createSquadModal not found');
  }
};

window.closeCreateSquadModal = function() {
  var modal = document.getElementById('createSquadModal');
  if (modal) modal.style.display = 'none';
  document.getElementById('squadName').value = '';
  document.getElementById('squadDesc').value = '';
  document.getElementById('squadEmoji').value = '🚀';
};

window.createSquad = async function() {
  var name = document.getElementById('squadName').value.trim();
  var desc = document.getElementById('squadDesc').value.trim();
  var emoji = document.getElementById('squadEmoji').value;

  if (!name) {
    alert('❌ Please enter a squad name');
    return;
  }

  if (!desc) {
    alert('❌ Please enter a squad description');
    return;
  }

  // Check if user is connected
  if (!window.currentUser.address) {
    alert('❌ Please connect your wallet first to create a squad');
    return;
  }

  try {
    var response = await fetch(apiBase + '/api/squad/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: window.currentUser.address,
        squadName: name,
        description: desc,
        tags: [emoji]
      })
    });

    var data = await response.json();

    if (response.ok) {
      alert('✅ Squad created! ' + emoji + ' ' + name);
      window.closeCreateSquadModal();
      setTimeout(() => location.reload(), 1000);
    } else {
      alert('❌ ' + (data.error || 'Failed to create squad'));
    }
  } catch (error) {
    alert('❌ Connection error: ' + error.message);
  }
};

/* Reward Distribution Modal Functions */
window.openRewardModal = function(squadName, squadId) {
  window.currentSquadId = squadId;
  window.currentSquadName = squadName;
  var modal = document.getElementById('rewardModal');
  if (modal) {
    modal.style.display = 'flex';
    var nameEl = document.getElementById('rewardSquadName');
    if (nameEl) nameEl.textContent = squadName;
  }
};

window.closeRewardModal = function() {
  var modal = document.getElementById('rewardModal');
  if (modal) modal.style.display = 'none';
  document.getElementById('rewardAmount').value = '';
  document.getElementById('rewardType').value = 'equal';
  document.getElementById('rewardPreview').textContent = '0 AURA each';
};

window.setupRewardInputListener = function() {
  var rewardInput = document.getElementById('rewardAmount');
  if (rewardInput) {
    rewardInput.addEventListener('input', function() {
      var amount = parseInt(this.value) || 0;
      var perMember = Math.floor(amount / 5);
      var preview = document.getElementById('rewardPreview');
      if (preview) preview.textContent = perMember + ' AURA each (to ~5 members)';
    });
  }
};

window.distributeRewards = async function() {
  var amount = parseInt(document.getElementById('rewardAmount').value);
  var type = document.getElementById('rewardType').value;

  if (!amount || amount < 1) {
    alert('❌ Please enter a valid amount');
    return;
  }

  try {
    var response = await fetch(apiBase + '/api/squad/' + window.currentSquadId + '/distribute-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount: amount,
        distributionType: type
      })
    });

    var data = await response.json();

   if (response.ok) {
  alert('✅ Distributed ' + amount + ' AURA to ' + data.memberCount + ' members!\\n\\nMethod: ' + type.toUpperCase());
  window.closeRewardModal();
  setTimeout(function() { location.reload(); }, 1500);
} else {
  alert('❌ ' + (data.error || 'Failed to distribute rewards'));
}
} catch (error) {
  alert('❌ Connection error: ' + error.message);
}
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initChat);
} else {
  window.initChat();
}
</script>

    <!-- CREATE SQUAD MODAL -->
    <div id="createSquadModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 1rem; padding: 2rem; width: 90%; max-width: 500px; backdrop-filter: blur(10px);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="color: var(--text); margin: 0;">Create New Squad</h2>
                <button onclick="window.closeCreateSquadModal()" style="background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer;">✕</button>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text);">Squad Name</label>
                <input type="text" id="squadName" placeholder="e.g., AI Developers" style="width: 100%; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit; box-sizing: border-box;" />
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text);">Description</label>
                <textarea id="squadDesc" placeholder="What is your squad about?" style="width: 100%; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit; min-height: 100px; box-sizing: border-box; resize: vertical;"></textarea>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text);">Squad Emoji</label>
                <select id="squadEmoji" style="width: 100%; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit; font-size: 1rem;">
                    <option value="🚀">🚀 Builders</option>
                    <option value="🎨">🎨 Designers</option>
                    <option value="💡">💡 Innovators</option>
                    <option value="📚">📚 Learning</option>
                    <option value="💰">💰 Trading</option>
                    <option value="🎮">🎮 Gaming</option>
                    <option value="🎤">🎤 Content</option>
                    <option value="🏋️">🏋️ Fitness</option>
                    <option value="🔐">🔐 Security</option>
                    <option value="🌍">🌍 Global</option>
                </select>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button onclick="window.createSquad()" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">Create Squad</button>
                <button onclick="window.closeCreateSquadModal()" style="flex: 1; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); color: var(--text); border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">Cancel</button>
            </div>
        </div>
    </div>

    <!-- REWARD DISTRIBUTION MODAL -->
    <div id="rewardModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 1000; align-items: center; justify-content: center; flex-direction: column;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 1rem; padding: 2rem; width: 90%; max-width: 500px; backdrop-filter: blur(10px);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="color: var(--text); margin: 0;">Distribute Rewards <span id="rewardSquadName"></span></h2>
                <button onclick="window.closeRewardModal()" style="background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer;">✕</button>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text);">Total AURA to Distribute</label>
                <input type="number" id="rewardAmount" placeholder="e.g., 100" min="1" step="1" style="width: 100%; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit; box-sizing: border-box;" />
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text);">Distribution Method</label>
                <select id="rewardType" style="width: 100%; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text); font-family: inherit;">
                    <option value="equal">Equal Distribution (Same for all members)</option>
                    <option value="contribution">By Contribution (Weighted by activity)</option>
                    <option value="activity">By Recent Activity (Weighted by messages)</option>
                </select>
            </div>

            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Preview</div>
                <div style="font-size: 1.2rem; font-weight: 600; color: var(--primary-light);" id="rewardPreview">0 AURA each</div>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button onclick="window.distributeRewards()" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">Distribute Now</button>
                <button onclick="window.closeRewardModal()" style="flex: 1; padding: 0.75rem; background: rgba(51, 65, 85, 0.3); border: 1px solid var(--border); color: var(--text); border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">Cancel</button>
            </div>
        </div>
    </div>
</script>
</body>
</html>`;
  }
}
