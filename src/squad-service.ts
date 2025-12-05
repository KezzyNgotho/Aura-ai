/**
 * Squad Service - Core squad management for Aura Squad
 * Handles squad creation, member management, and squad operations
 */

export interface SquadMember {
  userId: string;
  role: 'leader' | 'assistant' | 'contributor';
  joinedAt: string;
  contributionScore: number;
  earningsShare: number; // percentage (0-100)
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  leader: string; // userId of squad leader
  members: SquadMember[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'completed';
  tags: string[];
  avatarUrl?: string;
  totalEarnings: number;
  taskCount: number;
  rating: number; // 0-5 stars
}

export interface SquadChat {
  messageId: string;
  squadId: string;
  userId: string;
  userName: string;
  content: string;
  reactions: Record<string, string[]>; // emoji -> [userIds]
  timestamp: string;
  edited: boolean;
  editedAt?: string;
}

export interface ContributionEntry {
  squadId: string;
  userId: string;
  type: 'message' | 'solution' | 'review' | 'edit';
  points: number;
  timestamp: string;
  description: string;
}

export class SquadService {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Create a new squad
   */
  async createSquad(
    name: string,
    description: string,
    leaderId: string,
    tags: string[] = []
  ): Promise<Squad> {
    const squadId = crypto.randomUUID();
    const now = new Date().toISOString();

    const squad: Squad = {
      id: squadId,
      name,
      description,
      leader: leaderId,
      members: [
        {
          userId: leaderId,
          role: 'leader',
          joinedAt: now,
          contributionScore: 0,
          earningsShare: 40, // Leader gets 40% by default
        },
      ],
      createdAt: now,
      updatedAt: now,
      status: 'active',
      tags,
      totalEarnings: 0,
      taskCount: 0,
      rating: 0,
    };

    await this.kv.put(`squad:${squadId}`, JSON.stringify(squad));
    await this.kv.put(`squad:list:${leaderId}`, JSON.stringify([squadId]), {
      metadata: { type: 'squad_list' },
    });

    return squad;
  }

  /**
   * Get squad by ID
   */
  async getSquad(squadId: string): Promise<Squad | null> {
    const squad = await this.kv.get(`squad:${squadId}`, 'json');
    return (squad as Squad) || null;
  }

  /**
   * List all squads for a user (as leader or member)
   */
  async listSquadsForUser(userId: string): Promise<Squad[]> {
    const squads: Squad[] = [];

    // Get squads where user is leader
    const leaderSquadIds = ((await this.kv.get(`squad:list:${userId}`, 'json')) as string[]);
    if (leaderSquadIds) {
      for (const squadId of leaderSquadIds) {
        const squad = await this.getSquad(squadId);
        if (squad) squads.push(squad);
      }
    }

    // Get squads where user is member
    const memberSquadIds = ((await this.kv.get(`squad:member:${userId}`, 'json')) as string[]);
    if (memberSquadIds) {
      for (const squadId of memberSquadIds) {
        const squad = await this.getSquad(squadId);
        if (squad && !squads.find((s) => s.id === squadId)) {
          squads.push(squad);
        }
      }
    }

    return squads;
  }

  /**
   * Add a member to a squad
   */
  async addMember(
    squadId: string,
    userId: string,
    role: 'assistant' | 'contributor' = 'contributor'
  ): Promise<Squad> {
    const squad = await this.getSquad(squadId);
    if (!squad) throw new Error(`Squad ${squadId} not found`);

    // Check if already a member
    if (squad.members.find((m) => m.userId === userId)) {
      throw new Error(`User ${userId} is already a member of this squad`);
    }

    const now = new Date().toISOString();
    const newMember: SquadMember = {
      userId,
      role,
      joinedAt: now,
      contributionScore: 0,
      earningsShare: role === 'assistant' ? 30 : 20, // assistant gets 30%, contributor gets 20%
    };

    squad.members.push(newMember);
    squad.updatedAt = now;

    // Rebalance earnings shares if they exceed 100%
    await this.rebalanceEarningsShares(squad);

    await this.kv.put(`squad:${squadId}`, JSON.stringify(squad));

    // Add to user's member list
    const memberSquadIds = ((await this.kv.get(`squad:member:${userId}`, 'json')) as string[]) || [];
    if (!memberSquadIds.includes(squadId)) {
      memberSquadIds.push(squadId);
      await this.kv.put(`squad:member:${userId}`, JSON.stringify(memberSquadIds));
    }

    return squad;
  }

  /**
   * Remove a member from a squad
   */
  async removeMember(squadId: string, userId: string): Promise<Squad> {
    const squad = await this.getSquad(squadId);
    if (!squad) throw new Error(`Squad ${squadId} not found`);

    if (squad.leader === userId) {
      throw new Error('Cannot remove the squad leader');
    }

    squad.members = squad.members.filter((m) => m.userId !== userId);
    squad.updatedAt = new Date().toISOString();

    // Rebalance earnings shares
    await this.rebalanceEarningsShares(squad);

    await this.kv.put(`squad:${squadId}`, JSON.stringify(squad));

    // Remove from user's member list
    const memberSquadIds = ((await this.kv.get(`squad:member:${userId}`, 'json')) as string[]) || [];
    const filtered = memberSquadIds.filter((id: string) => id !== squadId);
    if (filtered.length > 0) {
      await this.kv.put(`squad:member:${userId}`, JSON.stringify(filtered));
    } else {
      await this.kv.delete(`squad:member:${userId}`);
    }

    return squad;
  }

  /**
   * Rebalance earnings shares so they don't exceed 100%
   */
  private async rebalanceEarningsShares(squad: Squad): Promise<void> {
    const totalShare = squad.members.reduce((sum, m) => sum + m.earningsShare, 0);

    if (totalShare > 100) {
      const scaleFactor = 100 / totalShare;
      for (const member of squad.members) {
        member.earningsShare = Math.round(member.earningsShare * scaleFactor);
      }
    }
  }

  /**
   * Add a chat message to squad
   */
  async addChatMessage(
    squadId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<SquadChat> {
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    const message: SquadChat = {
      messageId,
      squadId,
      userId,
      userName,
      content,
      reactions: {},
      timestamp: now,
      edited: false,
    };

    // Store message
    await this.kv.put(`chat:${messageId}`, JSON.stringify(message));

    // Add to squad's message list
    const messageIds = ((await this.kv.get(`chat:squad:${squadId}`, 'json')) as string[]) || [];
    messageIds.push(messageId);
    await this.kv.put(`chat:squad:${squadId}`, JSON.stringify(messageIds));

    // Log contribution
    await this.logContribution(squadId, userId, 'message', 1, `Message: ${content.substring(0, 30)}`);

    return message;
  }

  /**
   * Get squad chat
   */
  async getSquadChat(squadId: string, limit: number = 50): Promise<SquadChat[]> {
    const messageIds = (await this.kv.get(`chat:squad:${squadId}`, 'json')) as string[] || [];
    const messages: SquadChat[] = [];

    // Get the last N messages
    const recentIds = messageIds.slice(-limit);
    for (const messageId of recentIds) {
      const msg = await this.kv.get(`chat:${messageId}`, 'json');
      if (msg) {
        messages.push(msg as SquadChat);
      }
    }

    return messages;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<SquadChat> {
    const message = (await this.kv.get(`chat:${messageId}`, 'json')) as SquadChat;
    if (!message) throw new Error(`Message ${messageId} not found`);

    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }

    // Add user if not already reacted with this emoji
    if (!message.reactions[emoji].includes(userId)) {
      message.reactions[emoji].push(userId);
    }

    await this.kv.put(`chat:${messageId}`, JSON.stringify(message));

    return message;
  }

  /**
   * Log a contribution for reward calculation
   */
  async logContribution(
    squadId: string,
    userId: string,
    type: 'message' | 'solution' | 'review' | 'edit',
    points: number,
    description: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const entry: ContributionEntry = {
      squadId,
      userId,
      type,
      points,
      timestamp: now,
      description,
    };

    // Store contribution
    const key = `contrib:${squadId}:${userId}`;
    const contributions = ((await this.kv.get(key, 'json')) as ContributionEntry[]) || [];
    contributions.push(entry);
    await this.kv.put(key, JSON.stringify(contributions));

    // Update squad member's contribution score
    const squad = await this.getSquad(squadId);
    if (squad) {
      const member = squad.members.find((m) => m.userId === userId);
      if (member) {
        member.contributionScore += points;
        squad.updatedAt = now;
        await this.kv.put(`squad:${squadId}`, JSON.stringify(squad));
      }
    }
  }

  /**
   * Get contribution history for a squad member
   */
  async getContributions(squadId: string, userId: string): Promise<ContributionEntry[]> {
    const key = `contrib:${squadId}:${userId}`;
    const contributions = ((await this.kv.get(key, 'json')) as ContributionEntry[]) || [];
    return contributions;
  }

  /**
   * Calculate rewards for a squad based on contributions
   */
  async calculateRewards(squadId: string, totalAmount: number): Promise<Record<string, number>> {
    const squad = await this.getSquad(squadId);
    if (!squad) throw new Error(`Squad ${squadId} not found`);

    const rewards: Record<string, number> = {};

    // Simple reward model: based on earnings share and contribution score
    for (const member of squad.members) {
      const baseReward = (totalAmount * member.earningsShare) / 100;

      // Multiply by contribution multiplier (capped at 2x)
      const totalContribution = squad.members.reduce((sum, m) => sum + m.contributionScore, 0);
      const contributionMultiplier =
        totalContribution > 0
          ? Math.min(2, 1 + (member.contributionScore / totalContribution) * 0.5)
          : 1;

      rewards[member.userId] = Math.round(baseReward * contributionMultiplier);
    }

    return rewards;
  }

  /**
   * Get leaderboard for top squads
   */
  async getSquadLeaderboard(limit: number = 50): Promise<Squad[]> {
    // This is a simplified version - in production would use more efficient indexing
    const squads: Squad[] = [];

    // For now, we'd need to iterate through all squads
    // In production, maintain a sorted leaderboard in KV
    return squads.slice(0, limit);
  }

  /**
   * Get leaderboard for top contributors
   */
  async getContributorLeaderboard(limit: number = 50): Promise<
    Array<{ userId: string; totalScore: number; squads: number }>
  > {
    // This would aggregate contributions across all squads for a user
    // In production, maintain this in KV
    return [];
  }
}
