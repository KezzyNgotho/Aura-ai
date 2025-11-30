/**
 * Real-time Collaboration Service
 * Enables multiple users to collaborate on insights with comments and voting
 */

import { Insight } from './types';

export interface InsightComment {
  id: string;
  insightId: string;
  userId: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface InsightVote {
  userId: string;
  insightId: string;
  score: number; // 1 to 5
  timestamp: string;
}

export interface CollaborativeInsight {
  insight: Insight;
  comments: InsightComment[];
  votes: InsightVote[];
  averageScore: number;
  contributors: string[];
  improvementSuggestions: string[];
}

export class CollaborationService {
  constructor(private kv: KVNamespace) {}

  async addComment(insightId: string, userId: string, text: string): Promise<InsightComment> {
    const commentId = crypto.randomUUID();
    const comment: InsightComment = {
      id: commentId,
      insightId,
      userId,
      text,
      timestamp: new Date().toISOString(),
      likes: 0
    };

    await this.kv.put(`insight:${insightId}:comment:${commentId}`, JSON.stringify(comment));
    
    // Add to comment index
    const indexKey = `insight:${insightId}:comments`;
    const indexData = await this.kv.get(indexKey, 'json');
    const commentIds = indexData ? (indexData as any).ids : [];
    commentIds.push(commentId);
    await this.kv.put(indexKey, JSON.stringify({ ids: commentIds }));

    return comment;
  }

  async getComments(insightId: string): Promise<InsightComment[]> {
    const indexKey = `insight:${insightId}:comments`;
    const indexData = await this.kv.get(indexKey, 'json');
    
    if (!indexData) return [];

    const commentIds = (indexData as any).ids || [];
    const comments: InsightComment[] = [];

    for (const commentId of commentIds) {
      const comment = await this.kv.get(`insight:${insightId}:comment:${commentId}`, 'json');
      if (comment) {
        comments.push(comment as InsightComment);
      }
    }

    return comments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async voteOnInsight(insightId: string, userId: string, score: number): Promise<InsightVote> {
    if (score < 1 || score > 5) {
      throw new Error('Score must be between 1 and 5');
    }

    const vote: InsightVote = {
      userId,
      insightId,
      score,
      timestamp: new Date().toISOString()
    };

    await this.kv.put(`insight:${insightId}:vote:${userId}`, JSON.stringify(vote));

    return vote;
  }

  async getAverageScore(insightId: string): Promise<number> {
    const votesKey = `insight:${insightId}:votes`;
    const votesData = await this.kv.get(votesKey, 'json');
    
    if (!votesData) return 0;

    const votes = (votesData as any).votes || [];
    if (votes.length === 0) return 0;

    const sum = votes.reduce((acc: number, v: any) => acc + v.score, 0);
    return Math.round((sum / votes.length) * 10) / 10;
  }

  async likeComment(insightId: string, commentId: string, userId: string): Promise<void> {
    const key = `insight:${insightId}:comment:${commentId}:likes`;
    const likeData = await this.kv.get(key, 'json');
    const likes = likeData ? new Set((likeData as any).users) : new Set<string>();
    
    if (!likes.has(userId)) {
      likes.add(userId);
      await this.kv.put(key, JSON.stringify({ users: Array.from(likes) }));

      // Update comment likes count
      const comment = await this.kv.get(`insight:${insightId}:comment:${commentId}`, 'json');
      if (comment) {
        const c = comment as InsightComment;
        c.likes = likes.size;
        await this.kv.put(`insight:${insightId}:comment:${commentId}`, JSON.stringify(c));
      }
    }
  }

  async getCollaborativeInsight(insightId: string, insight: Insight): Promise<CollaborativeInsight> {
    const comments = await this.getComments(insightId);
    
    // Get all votes for this insight
    const votesKey = `insight:${insightId}:votes`;
    const votesData = await this.kv.get(votesKey, 'json');
    const votes = votesData ? (votesData as any).votes || [] : [];

    // Calculate average score
    const averageScore = votes.length > 0 
      ? Math.round((votes.reduce((acc: number, v: any) => acc + v.score, 0) / votes.length) * 10) / 10
      : 0;

    // Get unique contributors
    const contributors = new Set<string>();
    comments.forEach(c => contributors.add(c.userId));
    votes.forEach((v: any) => contributors.add(v.userId));
    contributors.add(insight.userId);

    // Generate improvement suggestions based on comments
    const improvements = this._generateImprovementSuggestions(comments);

    return {
      insight,
      comments,
      votes,
      averageScore,
      contributors: Array.from(contributors),
      improvementSuggestions: improvements
    };
  }

  private _generateImprovementSuggestions(comments: InsightComment[]): string[] {
    const suggestions: string[] = [];

    // Look for common themes in comments
    const text = comments.map(c => c.text.toLowerCase()).join(' ');

    if (text.includes('more') || text.includes('detail') || text.includes('example')) {
      suggestions.push('Add more detailed examples or case studies');
    }
    if (text.includes('risk') || text.includes('concern')) {
      suggestions.push('Expand risk analysis section');
    }
    if (text.includes('alternative') || text.includes('option')) {
      suggestions.push('Include more alternative approaches');
    }
    if (text.includes('source') || text.includes('reference') || text.includes('cite')) {
      suggestions.push('Add citations and sources for claims');
    }
    if (text.includes('visual') || text.includes('chart') || text.includes('diagram')) {
      suggestions.push('Consider adding visual aids or diagrams');
    }

    return suggestions.slice(0, 3);
  }
}
