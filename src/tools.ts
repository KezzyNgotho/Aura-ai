import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TokenEconomyService } from './token-service';
import { InsightEngine } from './insight-engine';
import { SquadService } from './squad-service';
import { IntelligentSquadAgent } from './intelligent-squad-agent';
import { Query, TokenTransactionType, InsightType } from './types';

export function setupServerTools(
  server: McpServer,
  tokenService: TokenEconomyService,
  insightEngine: InsightEngine,
  squadService: SquadService,
  agentService: IntelligentSquadAgent
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

  /**
   * Create a new squad
   */
  server.tool(
    'create_squad',
    'Create a new collaborative squad for completing tasks together',
    {
      userId: z.string().describe('User ID of the squad leader'),
      squadName: z.string().describe('Name of the squad'),
      description: z.string().describe('Description of what the squad will do'),
      tags: z.array(z.string()).optional().describe('Tags for the squad (e.g., "AI", "Marketing", "Design")'),
    },
    async ({ userId, squadName, description, tags }: {
      userId: string;
      squadName: string;
      description: string;
      tags?: string[];
    }) => {
      try {
        const squad = await squadService.createSquad(squadName, description, userId, tags || []);

        // Award tokens for creating squad
        await tokenService.earnTokens(
          userId,
          10,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Created squad: ${squadName}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `🎯 **Squad Created Successfully!**\n\n**Squad**: ${squad.name}\n**ID**: ${squad.id}\n**Leader**: ${userId}\n**Members**: 1\n**Reward**: +10 Aura Tokens\n\nStart by inviting team members to your squad!`
            }
          ],
          squad
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating squad: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Add a member to a squad
   */
  server.tool(
    'add_squad_member',
    'Add a team member to your squad',
    {
      squadId: z.string().describe('ID of the squad'),
      memberId: z.string().describe('User ID of the person to add'),
      role: z.enum(['assistant', 'contributor']).optional().describe('Role in the squad (assistant=30% earnings share, contributor=20%)'),
    },
    async ({ squadId, memberId, role }: {
      squadId: string;
      memberId: string;
      role?: 'assistant' | 'contributor';
    }) => {
      try {
        const squad = await squadService.addMember(squadId, memberId, role || 'contributor');

        // Award tokens to both leader and new member
        await tokenService.earnTokens(
          squad.leader,
          5,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Added member to squad: ${squad.name}`
        );

        await tokenService.earnTokens(
          memberId,
          5,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Joined squad: ${squad.name}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `✅ **Member Added to Squad!**\n\n**Squad**: ${squad.name}\n**New Member**: ${memberId}\n**Role**: ${role || 'contributor'}\n**Total Members**: ${squad.members.length}\n**Reward**: +5 Aura Tokens to both leader and member`
            }
          ],
          squad
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding member: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get squad info
   */
  server.tool(
    'get_squad_info',
    'Get detailed information about a squad',
    {
      squadId: z.string().describe('ID of the squad'),
    },
    async ({ squadId }: { squadId: string }) => {
      try {
        const squad = await squadService.getSquad(squadId);
        if (!squad) {
          return {
            content: [
              {
                type: 'text',
                text: `Squad ${squadId} not found`
              }
            ],
            error: 'Squad not found'
          };
        }

        const membersList = squad.members
          .map((m) => `• ${m.userId} (${m.role}) - Share: ${m.earningsShare}% - Score: ${m.contributionScore}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📋 **Squad Information**\n\n**Name**: ${squad.name}\n**Description**: ${squad.description}\n**Leader**: ${squad.leader}\n**Status**: ${squad.status}\n**Members**: ${squad.members.length}\n\n**Members**:\n${membersList}\n\n**Stats**:\n• Total Earnings: ${squad.totalEarnings} AURA\n• Tasks Completed: ${squad.taskCount}\n• Rating: ⭐ ${squad.rating}/5`
            }
          ],
          squad
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving squad info: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * List squads for a user
   */
  server.tool(
    'list_my_squads',
    'List all squads you are a member of or lead',
    {
      userId: z.string().describe('User ID'),
    },
    async ({ userId }: { userId: string }) => {
      try {
        const squads = await squadService.listSquadsForUser(userId);

        if (squads.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `You haven't created or joined any squads yet. Use create_squad to start a new squad!`
              }
            ],
            squads: []
          };
        }

        const squadsList = squads
          .map((s) => `• **${s.name}** (${s.id})\n  Members: ${s.members.length} | Earnings: ${s.totalEarnings} AURA | Rating: ⭐${s.rating}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `👥 **Your Squads** (${squads.length})\n\n${squadsList}`
            }
          ],
          squads
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing squads: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Send a message in squad chat
   */
  server.tool(
    'squad_chat',
    'Send a message in your squad chat',
    {
      squadId: z.string().describe('ID of the squad'),
      userId: z.string().describe('Your user ID'),
      userName: z.string().describe('Your display name'),
      message: z.string().describe('Your message'),
    },
    async ({ squadId, userId, userName, message }: {
      squadId: string;
      userId: string;
      userName: string;
      message: string;
    }) => {
      try {
        const squad = await squadService.getSquad(squadId);
        if (!squad) {
          throw new Error(`Squad ${squadId} not found`);
        }

        const chatMessage = await squadService.addChatMessage(squadId, userId, userName, message);

        // Award tokens for chat participation
        await tokenService.earnTokens(
          userId,
          1,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Chat message in squad: ${squad.name}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `💬 **Message Sent!**\n\n**From**: ${userName}\n**Squad**: ${squad.name}\n**Message**: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n**Reward**: +1 Aura Token`
            }
          ],
          message: chatMessage
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get squad chat messages
   */
  server.tool(
    'get_squad_chat',
    'Retrieve recent messages from squad chat',
    {
      squadId: z.string().describe('ID of the squad'),
      limit: z.number().optional().describe('Number of messages to retrieve (default: 50)'),
    },
    async ({ squadId, limit }: { squadId: string; limit?: number }) => {
      try {
        const messages = await squadService.getSquadChat(squadId, limit || 50);

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No messages in this squad yet. Be the first to send one!`
              }
            ],
            messages: []
          };
        }

        const messagesList = messages
          .slice(-10) // Show last 10
          .map((m) => `**${m.userName}**: ${m.content}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `💬 **Squad Chat** (${messages.length} total messages)\n\n${messagesList}`
            }
          ],
          messages
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving chat: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * React to a message with an emoji
   */
  server.tool(
    'react_to_message',
    'Add a reaction (emoji) to a squad chat message',
    {
      messageId: z.string().describe('ID of the message'),
      emoji: z.string().describe('Emoji to react with (e.g., "👍", "🔥", "😂")'),
      userId: z.string().describe('Your user ID'),
    },
    async ({ messageId, emoji, userId }: {
      messageId: string;
      emoji: string;
      userId: string;
    }) => {
      try {
        const message = await squadService.addReaction(messageId, emoji, userId);

        // Award tokens for reactions
        await tokenService.earnTokens(
          userId,
          0.5,
          TokenTransactionType.EARN_ENGAGEMENT,
          `Reacted to message with ${emoji}`
        );

        const reactionCounts = Object.entries(message.reactions)
          .map(([em, users]) => `${em} ${users.length}`)
          .join(' ');

        return {
          content: [
            {
              type: 'text',
              text: `🎉 **Reaction Added!**\n\n**Emoji**: ${emoji}\n**Message**: ${message.content.substring(0, 50)}\n**Reactions**: ${reactionCounts || 'None'}\n**Reward**: +0.5 Aura Token`
            }
          ],
          message
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get member contributions
   */
  server.tool(
    'get_contributions',
    'View a squad member\'s contribution history',
    {
      squadId: z.string().describe('ID of the squad'),
      userId: z.string().describe('User ID to check contributions for'),
    },
    async ({ squadId, userId }: { squadId: string; userId: string }) => {
      try {
        const contributions = await squadService.getContributions(squadId, userId);
        const squad = await squadService.getSquad(squadId);

        if (!squad) {
          throw new Error(`Squad ${squadId} not found`);
        }

        const member = squad.members.find((m) => m.userId === userId);
        if (!member) {
          throw new Error(`User ${userId} is not a member of this squad`);
        }

        const contributionsList = contributions
          .map((c) => `• **${c.type}** (${c.points} pts): ${c.description}`)
          .join('\n') || 'No contributions yet';

        return {
          content: [
            {
              type: 'text',
              text: `📊 **Contributions for ${userId}**\n\n**Squad**: ${squad.name}\n**Total Score**: ${member.contributionScore}\n**Earnings Share**: ${member.earningsShare}%\n**Role**: ${member.role}\n\n**Activity**:\n${contributionsList}`
            }
          ],
          contributions
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving contributions: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * AI Agent: Analyze squad health and get recommendations
   */
  server.tool(
    'analyze_squad_health',
    'Use AI to analyze your squad\'s health and get recommendations for improvement',
    {
      squadId: z.string().describe('ID of the squad to analyze'),
    },
    async ({ squadId }: { squadId: string }) => {
      try {
        const squad = await squadService.getSquad(squadId);
        if (!squad) {
          throw new Error(`Squad ${squadId} not found`);
        }

        const analysis = await agentService.analyzeSquadHealth(squad);

        const issuesText = analysis.issues.length > 0
          ? analysis.issues.map((i) => `⚠️ ${i}`).join('\n')
          : '✅ No issues detected';

        const suggestionsText = analysis.suggestions.length > 0
          ? analysis.suggestions.map((s) => `💡 ${s}`).join('\n')
          : 'Squad is in great shape!';

        return {
          content: [
            {
              type: 'text',
              text: `🏥 **Squad Health Analysis**\n\n**Overall Health**: ${analysis.healthScore}/100\n**Estimated Productivity**: ${analysis.estimatedProductivity}%\n\n**Recommendation**: ${analysis.recommendation}\n\n**Issues**:\n${issuesText}\n\n**Suggestions**:\n${suggestionsText}\n\n**Recommended Actions**:\n${analysis.recommendedActions.map((a) => `• ${a}`).join('\n')}`
            }
          ],
          analysis
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error analyzing squad: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * AI Agent: Get member profile analysis
   */
  server.tool(
    'analyze_member_profile',
    'Use AI to analyze a member\'s skills, strengths, and recommended role',
    {
      userId: z.string().describe('User ID to analyze'),
    },
    async ({ userId }: { userId: string }) => {
      try {
        const profile = await agentService.analyzeMemberProfile(userId);

        return {
          content: [
            {
              type: 'text',
              text: `👤 **Member Analysis: ${userId}**\n\n**Quality Score**: ${profile.averageQuality.toFixed(1)}/100\n**Reliability**: ${profile.reliability}/100\n**Availability**: ${profile.availability}%\n**Specialization**: ${profile.specialization}\n\n**Skills**: ${profile.skillTags.join(', ') || 'None detected yet'}\n**Recommended Role**: ${profile.recommendedRole}\n\n**Stats**:\n• Total Contributions: ${profile.totalContributions}\n• Squads Joined: ${profile.joinedSquadsCount}\n• Average Earnings: ${profile.averageEarnings} AURA`
            }
          ],
          profile
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error analyzing profile: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * AI Agent: Find best member matches for squad
   */
  server.tool(
    'find_squad_members',
    'Use AI to find the best members to invite to your squad based on skills and roles',
    {
      requiredSkills: z.array(z.string()).describe('Skills needed (e.g., ["marketing", "design"])'),
      desiredRoles: z.array(z.enum(['leader', 'assistant', 'contributor'])).describe('Desired roles to fill'),
      experienceLevel: z.enum(['junior', 'mid', 'senior']).describe('Experience level needed'),
    },
    async ({
      requiredSkills,
      desiredRoles,
      experienceLevel
    }: {
      requiredSkills: string[];
      desiredRoles: ('leader' | 'assistant' | 'contributor')[];
      experienceLevel: 'junior' | 'mid' | 'senior';
    }) => {
      try {
        const matches = await agentService.findMemberMatches({
          requiredSkills,
          desiredRoles,
          availability: 75,
          experienceLevel
        });

        const matchesText = matches
          .slice(0, 5)
          .map(
            (m) =>
              `• **${m.userId}** (${m.matchScore}% match)\n  Role: ${m.suggestedRole} | Productivity: ${m.estimatedProductivity.toFixed(0)}%\n  Reason: ${m.reasoning}`
          )
          .join('\n\n') || 'No matches found';

        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Member Recommendations**\n\nLooking for: ${requiredSkills.join(', ')} (${experienceLevel})\n\n**Top Matches**:\n${matchesText}`
            }
          ],
          matches
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error finding matches: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * AI Agent: Optimize reward distribution
   */
  server.tool(
    'optimize_rewards',
    'Use AI to optimize reward distribution based on member contributions and quality',
    {
      squadId: z.string().describe('ID of the squad'),
      totalReward: z.number().describe('Total reward amount to distribute (in AURA tokens)'),
    },
    async ({ squadId, totalReward }: { squadId: string; totalReward: number }) => {
      try {
        const squad = await squadService.getSquad(squadId);
        if (!squad) {
          throw new Error(`Squad ${squadId} not found`);
        }

        // Get all contributions for this squad
        const contributions: Record<string, any[]> = {};
        for (const member of squad.members) {
          const contribs = await squadService.getContributions(squadId, member.userId);
          contributions[member.userId] = contribs;
        }

        const optimization = await agentService.optimizeRewardDistribution(
          squad,
          totalReward,
          contributions
        );

        const distributionText = Object.entries(optimization.optimizedDistribution)
          .map(([userId, amount]) => {
            const original = optimization.originalDistribution[userId];
            const improvement = optimization.improvements[userId];
            const change = improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
            return `• ${userId}: ${amount} AURA (was ${original}, ${change} change)`;
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `💰 **Optimized Reward Distribution**\n\n**Efficiency Gain**: ${optimization.totalEfficiencyGain}%\n**Reasoning**: ${optimization.reasoning}\n\n**Distribution**:\n${distributionText}\n\n**Total**: ${totalReward} AURA`
            }
          ],
          optimization
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error optimizing rewards: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * AI Agent: Predict squad success
   */
  server.tool(
    'predict_squad_success',
    'Use AI to predict the probability of squad success based on composition and activity',
    {
      squadId: z.string().describe('ID of the squad'),
    },
    async ({ squadId }: { squadId: string }) => {
      try {
        const squad = await squadService.getSquad(squadId);
        if (!squad) {
          throw new Error(`Squad ${squadId} not found`);
        }

        const successProbability = await agentService.predictSquadSuccess(squad);

        let prediction = '';
        if (successProbability > 80) {
          prediction =
            'Very likely to succeed! Squad has strong composition and engagement.';
        } else if (successProbability > 60) {
          prediction = 'Good chance of success. Some improvements could help.';
        } else if (successProbability > 40) {
          prediction = 'Moderate success probability. Need more work on team composition.';
        } else {
          prediction = 'Low success probability. Urgent action needed.';
        }

        return {
          content: [
            {
              type: 'text',
              text: `🎯 **Squad Success Prediction**\n\n**Probability**: ${successProbability.toFixed(0)}%\n\n**Assessment**: ${prediction}\n\n**Factors Analyzed**:\n• Squad size: ${squad.members.length} members\n• Role distribution: ${squad.members.map((m) => m.role).join(', ')}\n• Active members: ${squad.members.filter((m) => m.contributionScore > 0).length}/${squad.members.length}\n• Age: ${Math.round((new Date().getTime() - new Date(squad.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`
            }
          ],
          successProbability
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error predicting success: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
} 