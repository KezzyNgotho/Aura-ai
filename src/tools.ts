import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TokenEconomyService } from './token-service';
import { InsightEngine } from './insight-engine';
import { Query, TokenTransactionType, InsightType } from './types';

export function setupServerTools(
  server: McpServer,
  tokenService: TokenEconomyService,
  insightEngine: InsightEngine
) {
  /**
   * Process a user query and generate an insight
   */
  server.tool(
    'process_query',
    'Submit a question or situation to receive transparent, actionable insights',
    {
      userId: z.string().describe('Unique identifier for the user'),
      queryText: z.string().describe('The user\'s question or situation'),
      category: z.enum(['finance', 'learning', 'business', 'trends', 'personal']).optional().describe('Optional category hint for the insight type'),
      platform: z.enum(['whatsapp', 'telegram', 'discord', 'web']).optional().describe('Platform where the query originated'),
    },
    async ({ userId, queryText, category, platform }: {
      userId: string;
      queryText: string;
      category?: string;
      platform?: string;
    }) => {
      try {
        const query: Query = {
          id: crypto.randomUUID(),
          userId,
          text: queryText,
          category: category as InsightType | undefined,
          platform: (platform as 'whatsapp' | 'telegram' | 'discord' | 'web') || 'web',
          timestamp: new Date().toISOString(),
          resolved: false
        };

        // Generate insight
        const insight = await insightEngine.generateInsight(query, userId);

        // Award base tokens for engagement
        await tokenService.earnTokens(
          userId,
          insight.tokensRewarded,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Earned tokens for query: "${queryText.substring(0, 50)}..."`
        );

        return {
          content: [
            {
              type: 'text',
              text: `✨ **Insight Generated**\n\n${insight.recommendation}\n\n**Your Reward**: +${insight.tokensRewarded} Aura Tokens\n**Insight ID**: ${insight.id}`
            }
          ],
          insight: {
            id: insight.id,
            type: insight.type,
            recommendation: insight.recommendation,
            explanation: insight.explanation,
            actionableSteps: insight.actionableSteps,
            deepInsightAvailable: insight.deepInsightAvailable,
            deepInsightTokenCost: insight.deepInsightTokenCost
          }
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error processing query: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get user's current token balance
   */
  server.tool(
    'get_user_tokens',
    'Retrieve your current Aura Token balance and statistics',
    {
      userId: z.string().describe('User ID'),
    },
    async ({ userId }: { userId: string }) => {
      try {
        const tokens = await tokenService.getUserTokens(userId);
        
        return {
          content: [
            {
              type: 'text',
              text: `💰 **Your Aura Token Balance**\n\n**Current Balance**: ${tokens.balance} tokens\n**Total Earned**: ${tokens.totalEarned} tokens\n**Total Spent**: ${tokens.totalSpent} tokens\n**Last Updated**: ${new Date(tokens.lastUpdated).toLocaleString()}`
            }
          ],
          tokens
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Spend tokens to unlock deeper insights
   */
  server.tool(
    'spend_tokens',
    'Spend Aura Tokens to unlock deeper analysis of an existing insight',
    {
      userId: z.string().describe('User ID'),
      insightId: z.string().describe('ID of the insight to deepen'),
      tokenAmount: z.number().describe('Number of tokens to spend'),
    },
    async ({ userId, insightId, tokenAmount }: {
      userId: string;
      insightId: string;
      tokenAmount: number;
    }) => {
      try {
        // Attempt to spend tokens
        const transaction = await tokenService.spendTokens(
          userId,
          tokenAmount,
          TokenTransactionType.SPEND_DEEP_INSIGHT,
          `Unlocked deeper insight for ID: ${insightId}`
        );

        if (!transaction) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Insufficient tokens. You need ${tokenAmount} tokens but have fewer available.`
              }
            ],
            success: false
          };
        }

        // Generate deep insight
        const deepInsight = await insightEngine.generateDeepInsight(insightId);

        return {
          content: [
            {
              type: 'text',
              text: `🔓 **Deep Insight Unlocked**\n\n${deepInsight.recommendation}\n\n**Tokens Spent**: -${tokenAmount}\n**Remaining Balance**: Check with get_user_tokens`
            }
          ],
          insight: deepInsight,
          transaction
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error spending tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get transaction history
   */
  server.tool(
    'get_transaction_history',
    'View your Aura Token transaction history',
    {
      userId: z.string().describe('User ID'),
      limit: z.number().optional().describe('Number of recent transactions to retrieve (default: 20)'),
    },
    async ({ userId, limit }: { userId: string; limit?: number }) => {
      try {
        const transactions = await tokenService.getTransactionHistory(userId, limit || 20);

        const transactionText = transactions
          .map((t) => `• **${t.type}**: ${t.amount > 0 ? '+' : '-'}${Math.abs(t.amount)} tokens - ${t.description}`)
          .join('\n') || 'No transactions yet';

        return {
          content: [
            {
              type: 'text',
              text: `📊 **Transaction History**\n\n${transactionText}`
            }
          ],
          transactions
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * System tool: Award tokens to a user (admin only)
   */
  server.tool(
    'award_tokens',
    'Award Aura Tokens to a user (admin tool)',
    {
      userId: z.string().describe('User ID to award tokens to'),
      amount: z.number().describe('Number of tokens to award'),
      reason: z.string().describe('Reason for awarding tokens'),
    },
    async ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
      try {
        const transaction = await tokenService.earnTokens(
          userId,
          amount,
          TokenTransactionType.ADMIN_AWARD,
          reason
        );

        return {
          content: [
            {
              type: 'text',
              text: `✅ Awarded ${amount} tokens to user ${userId}. Reason: ${reason}`
            }
          ],
          transaction
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error awarding tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
} 