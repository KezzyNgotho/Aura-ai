/**
 * Token Economy Service
 * Manages Aura Token tracking, earning, spending, and transactions
 */

import { AuraToken, TokenTransaction, TokenTransactionType } from './types';

export interface TokenService {
  getUserTokens(userId: string): Promise<AuraToken>;
  earnTokens(userId: string, amount: number, type: TokenTransactionType, description: string, metadata?: Record<string, unknown>): Promise<TokenTransaction>;
  spendTokens(userId: string, amount: number, type: TokenTransactionType, description: string, metadata?: Record<string, unknown>): Promise<TokenTransaction | null>;
  getTransactionHistory(userId: string, limit?: number): Promise<TokenTransaction[]>;
  getTokenStats(): Promise<{
    totalUsers: number;
    totalTokensIssued: number;
    averageBalance: number;
    totalTransactions: number;
  }>;
}

export class TokenEconomyService implements TokenService {
  constructor(private kv: KVNamespace) {}

  async getUserTokens(userId: string): Promise<AuraToken> {
    const key = `user:tokens:${userId}`;
    const existing = await this.kv.get(key, 'json');
    
    if (existing) {
      return existing as AuraToken;
    }

    // Initialize new user tokens
    const newTokens: AuraToken = {
      userId,
      balance: 100, // Starting tokens
      totalEarned: 100,
      totalSpent: 0,
      lastUpdated: new Date().toISOString()
    };

    await this.kv.put(key, JSON.stringify(newTokens));
    return newTokens;
  }

  async earnTokens(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<TokenTransaction> {
    const transaction = await this._createTransaction(userId, amount, type, description, metadata);
    
    const tokens = await this.getUserTokens(userId);
    tokens.balance += amount;
    tokens.totalEarned += amount;
    tokens.lastUpdated = new Date().toISOString();
    
    await this.kv.put(`user:tokens:${userId}`, JSON.stringify(tokens));
    await this._saveTransaction(transaction);

    return transaction;
  }

  async spendTokens(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<TokenTransaction | null> {
    const tokens = await this.getUserTokens(userId);

    if (tokens.balance < amount) {
      return null; // Insufficient tokens
    }

    const transaction = await this._createTransaction(userId, -amount, type, description, metadata);
    
    tokens.balance -= amount;
    tokens.totalSpent += amount;
    tokens.lastUpdated = new Date().toISOString();
    
    await this.kv.put(`user:tokens:${userId}`, JSON.stringify(tokens));
    await this._saveTransaction(transaction);

    return transaction;
  }

  async getTransactionHistory(userId: string, limit: number = 50): Promise<TokenTransaction[]> {
    const key = `user:transactions:${userId}`;
    const txnsJson = await this.kv.get(key);
    
    if (!txnsJson) {
      return [];
    }

    const transactions = JSON.parse(txnsJson) as TokenTransaction[];
    return transactions.slice(-limit).reverse();
  }

  async getTokenStats(): Promise<{
    totalUsers: number;
    totalTokensIssued: number;
    averageBalance: number;
    totalTransactions: number;
  }> {
    // This would typically query a summary stored in KV
    // For now, returning placeholder
    return {
      totalUsers: 0,
      totalTokensIssued: 0,
      averageBalance: 0,
      totalTransactions: 0
    };
  }

  private async _createTransaction(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<TokenTransaction> {
    return {
      id: crypto.randomUUID(),
      userId,
      type,
      amount: Math.abs(amount),
      description,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  private async _saveTransaction(transaction: TokenTransaction): Promise<void> {
    const key = `user:transactions:${transaction.userId}`;
    const existing = await this.kv.get(key);
    
    let transactions: TokenTransaction[] = [];
    if (existing) {
      transactions = JSON.parse(existing);
    }

    transactions.push(transaction);
    
    // Keep last 1000 transactions per user
    if (transactions.length > 1000) {
      transactions = transactions.slice(-1000);
    }

    await this.kv.put(key, JSON.stringify(transactions));
  }
}
