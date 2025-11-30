/**
 * Core types for Aura-AI system
 */

export enum InsightType {
  FINANCE = 'finance',
  LEARNING = 'learning',
  BUSINESS = 'business',
  TRENDS = 'trends',
  PERSONAL = 'personal'
}

export enum TokenTransactionType {
  EARN_ENGAGEMENT = 'earn_engagement',
  EARN_APPLICATION = 'earn_application',
  SPEND_DEEP_INSIGHT = 'spend_deep_insight',
  SPEND_PREMIUM_FEATURE = 'spend_premium_feature',
  ADMIN_AWARD = 'admin_award',
  ADMIN_DEDUCT = 'admin_deduct'
}

export interface AuraToken {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: TokenTransactionType;
  amount: number;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Query {
  id: string;
  userId: string;
  text: string;
  category?: InsightType;
  platform: 'whatsapp' | 'telegram' | 'discord' | 'web';
  timestamp: string;
  resolved: boolean;
}

export interface InsightExplanation {
  reasoning: string;
  dataPoints: string[];
  alternatives?: string[];
  riskFactors?: string[];
}

export interface Insight {
  id: string;
  queryId: string;
  userId: string;
  type: InsightType;
  recommendation: string;
  explanation: InsightExplanation;
  actionableSteps: string[];
  tokensRewarded: number;
  timestamp: string;
  deepInsightAvailable: boolean;
  deepInsightTokenCost?: number;
}

export interface UserProfile {
  userId: string;
  username?: string;
  email?: string;
  joinedAt: string;
  totalQueries: number;
  totalInsights: number;
  favoriteInsightTypes: InsightType[];
  platformPreferences: {
    whatsapp?: string;
    telegram?: string;
    discord?: string;
    web?: boolean;
  };
  settings: {
    transparencyLevel: 'minimal' | 'detailed' | 'full';
    dailyInsightLimit?: number;
    autoAwardTokens: boolean;
  };
}

export interface MCPQuery {
  uri: string;
  userId: string;
  queryText: string;
  includeExplanation: boolean;
}

export interface MCPInsight {
  uri: string;
  insight: Insight;
  transparency: {
    fullyExplained: boolean;
    explainabilityScore: number;
  };
}

export interface MCPTransaction {
  uri: string;
  transaction: TokenTransaction;
}
