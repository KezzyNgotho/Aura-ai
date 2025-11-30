/**
 * Insight Marketplace
 * Share, discover, and monetize insights
 */

import { Insight } from './types';

export interface SharedInsight {
  id: string;
  originalInsightId: string;
  userId: string;
  insight: Insight;
  title: string;
  description: string;
  tags: string[];
  shareLink: string;
  likes: number;
  views: number;
  tokenReward: number; // Tokens earned from shares
  timestamp: string;
  isPublic: boolean;
}

export interface InsightCollection {
  id: string;
  userId: string;
  name: string;
  description: string;
  insights: string[]; // insight IDs
  isPublic: boolean;
  likes: number;
  timestamp: string;
}

export class InsightMarketplace {
  constructor(private kv: KVNamespace) {}

  async shareInsight(insight: Insight, userId: string, options: {
    title: string;
    description: string;
    tags: string[];
    isPublic: boolean;
  }): Promise<SharedInsight> {
    const shareId = crypto.randomUUID();
    const shareLink = `aura.ai/shared/${shareId}`;

    const shared: SharedInsight = {
      id: shareId,
      originalInsightId: insight.id,
      userId,
      insight,
      title: options.title,
      description: options.description,
      tags: options.tags,
      shareLink,
      likes: 0,
      views: 0,
      tokenReward: 0,
      timestamp: new Date().toISOString(),
      isPublic: options.isPublic
    };

    await this.kv.put(`shared_insight:${shareId}`, JSON.stringify(shared));
    await this._addToFeed(shareId, userId);

    return shared;
  }

  async getSharedInsight(shareId: string): Promise<SharedInsight | null> {
    const data = await this.kv.get(`shared_insight:${shareId}`, 'json');
    if (data) {
      // Increment views
      const shared = data as SharedInsight;
      shared.views = (shared.views || 0) + 1;
      await this.kv.put(`shared_insight:${shareId}`, JSON.stringify(shared));
      return shared;
    }
    return null;
  }

  async likeInsight(shareId: string, userId: string): Promise<void> {
    const key = `shared_insight:${shareId}:likes`;
    const likes = await this.kv.get(key, 'json');
    const likeSet = likes ? new Set((likes as any).users) : new Set<string>();
    
    if (!likeSet.has(userId)) {
      likeSet.add(userId);
      await this.kv.put(key, JSON.stringify({ users: Array.from(likeSet) }));
      
      // Update shared insight
      const shared = await this.getSharedInsight(shareId);
      if (shared) {
        shared.likes = likeSet.size;
        await this.kv.put(`shared_insight:${shareId}`, JSON.stringify(shared));
      }
    }
  }

  async getTrendingInsights(limit = 10): Promise<SharedInsight[]> {
    const feed = await this.kv.get('insights:feed', 'json');
    if (!feed) return [];

    const feedData = feed as any;
    const recentIds = feedData.ids || [];

    const insights: SharedInsight[] = [];
    for (const id of recentIds.slice(0, limit * 2)) {
      const insight = await this.getSharedInsight(id);
      if (insight && insight.isPublic) {
        insights.push(insight);
      }
    }

    // Sort by engagement (likes + views)
    return insights
      .sort((a, b) => (b.likes * 2 + b.views) - (a.likes * 2 + a.views))
      .slice(0, limit);
  }

  async createCollection(userId: string, name: string, description: string): Promise<InsightCollection> {
    const collectionId = crypto.randomUUID();

    const collection: InsightCollection = {
      id: collectionId,
      userId,
      name,
      description,
      insights: [],
      isPublic: false,
      likes: 0,
      timestamp: new Date().toISOString()
    };

    await this.kv.put(`collection:${collectionId}`, JSON.stringify(collection));
    
    return collection;
  }

  async addToCollection(collectionId: string, insightId: string): Promise<void> {
    const collection = await this.kv.get(`collection:${collectionId}`, 'json');
    if (collection) {
      const col = collection as InsightCollection;
      if (!col.insights.includes(insightId)) {
        col.insights.push(insightId);
        await this.kv.put(`collection:${collectionId}`, JSON.stringify(col));
      }
    }
  }

  private async _addToFeed(shareId: string, userId: string): Promise<void> {
    const feedKey = 'insights:feed';
    const feed = await this.kv.get(feedKey, 'json');
    const feedData = feed ? (feed as any) : { ids: [] };

    feedData.ids = [shareId, ...((feedData.ids || []) as string[]).slice(0, 99)];
    
    await this.kv.put(feedKey, JSON.stringify(feedData));
  }
}
