/**
 * Authentication Service
 * Handles user authentication with JWT, wallet verification, and session management
 */

import { UserProfile } from './types';

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  userId: string;
  username: string;
  email?: string;
  walletAddress?: string;
  role: 'user' | 'admin';
  createdAt: string;
  expiresAt: string;
}

export interface LoginRequest {
  email?: string;
  password?: string;
  walletAddress?: string;
  walletSignature?: string;
  walletMessage?: string;
}

export interface SignupRequest {
  username: string;
  email?: string;
  password?: string;
  walletAddress?: string;
}

export class AuthService {
  private jwtSecret: string;
  private tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private refreshExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(
    private kv: KVNamespace,
    secret: string
  ) {
    this.jwtSecret = secret;
  }

  /**
   * Create JWT token
   */
  private async createJWT(payload: Record<string, any>, expiresIn: number): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + Math.floor(expiresIn / 1000)
    };

    const headerEncoded = this.base64url(JSON.stringify(header));
    const payloadEncoded = this.base64url(JSON.stringify(tokenPayload));
    const signature = this.base64url(
      await this.hmacSha256(
        `${headerEncoded}.${payloadEncoded}`,
        this.jwtSecret
      )
    );

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  async verifyJWT(token: string): Promise<Record<string, any> | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
      const expectedSignature = this.base64url(
        await this.hmacSha256(
          `${headerEncoded}.${payloadEncoded}`,
          this.jwtSecret
        )
      );

      if (signatureEncoded !== expectedSignature) return null;

      const payload = JSON.parse(this.base64urlDecode(payloadEncoded));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now) return null; // Token expired

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Register new user with email/password or wallet
   */
  async signup(req: SignupRequest): Promise<{ userId: string; session: AuthSession } | null> {
    try {
      // For wallet-only signup, generate email from wallet address
      const email = req.email || (req.walletAddress ? `${req.walletAddress}@wallet.aura` : null);
      
      if (!email && !req.walletAddress) {
        return null; // Need at least email/password or wallet
      }

      // Check if user exists by email (if provided)
      if (email && email !== `${req.walletAddress}@wallet.aura`) {
        const existingUser = await this.kv.get(`user:email:${email.toLowerCase()}`);
        if (existingUser) return null; // User already exists
      }

      // Check if wallet already registered
      if (req.walletAddress) {
        const existingWallet = await this.kv.get(`user:wallet:${req.walletAddress.toLowerCase()}`);
        if (existingWallet) return null; // Wallet already registered
      }

      const userId = `user_${crypto.randomUUID()}`;
      const passwordHash = req.password ? await this.hashPassword(req.password) : null;

      // Create user record
      const userRecord = {
        userId,
        username: req.username || (req.walletAddress ? req.walletAddress.slice(0, 10) : 'user'),
        email: email || null,
        passwordHash,
        walletAddress: req.walletAddress || null,
        role: 'user',
        createdAt: new Date().toISOString(),
        verified: req.walletAddress ? true : false, // Wallets are auto-verified
        totalTokensEarned: 0,
        totalTokensSpent: 0,
        rewardsMinted: 0
      };

      await this.kv.put(`user:${userId}`, JSON.stringify(userRecord));
      
      if (email && email !== `${req.walletAddress}@wallet.aura`) {
        await this.kv.put(`user:email:${email.toLowerCase()}`, userId);
      }
      
      if (req.username) {
        await this.kv.put(`user:username:${req.username.toLowerCase()}`, userId);
      }
      
      if (req.walletAddress) {
        await this.kv.put(`user:wallet:${req.walletAddress.toLowerCase()}`, userId);
      }

      // Initialize user profile
      const profile: UserProfile = {
        userId,
        username: userRecord.username,
        email: email || undefined,
        joinedAt: new Date().toISOString(),
        totalQueries: 0,
        totalInsights: 0,
        favoriteInsightTypes: [],
        platformPreferences: { web: true },
        settings: {
          transparencyLevel: 'detailed',
          autoAwardTokens: true
        }
      };

      await this.kv.put(`user:profile:${userId}`, JSON.stringify(profile));

      const session = await this.createSession(userId, userRecord.username, email || undefined, req.walletAddress);
      return { userId, session };
    } catch {
      return null;
    }
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<AuthSession | null> {
    try {
      const userId = await this.kv.get(`user:email:${email.toLowerCase()}`);
      if (!userId) return null;

      const userRecord = await this.kv.get(`user:${userId}`, 'json');
      if (!userRecord) return null;

      const passwordMatch = await this.verifyPassword(
        password,
        (userRecord as any).passwordHash
      );
      if (!passwordMatch) return null;

      return this.createSession(
        userId as string,
        (userRecord as any).username,
        email,
        (userRecord as any).walletAddress
      );
    } catch {
      return null;
    }
  }

  /**
   * Login with wallet signature (EIP-191)
   * User signs a message with their private key to prove ownership
   */
  async loginWithWallet(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<AuthSession | null> {
    try {
      // Verify signature matches wallet (simple verification)
      // In production, use ethers.js or web3.js for proper EIP-191 verification
      const isValid = this.verifyWalletSignature(walletAddress, message, signature);
      
      if (!isValid) {
        return null;
      }

      // Find user by wallet
      const userId = await this.kv.get(`user:wallet:${walletAddress.toLowerCase()}`);
      
      if (!userId) {
        // Auto-create user if doesn't exist (zero-knowledge signup)
        return this.createWalletUser(walletAddress);
      }

      const userRecord = await this.kv.get(`user:${userId}`, 'json');
      if (!userRecord) return null;

      return this.createSession(
        userId as string,
        (userRecord as any).username,
        (userRecord as any).email,
        walletAddress
      );
    } catch {
      return null;
    }
  }

  /**
   * Create user from wallet address (no email/password needed)
   */
  private async createWalletUser(walletAddress: string): Promise<AuthSession | null> {
    try {
      const userId = `user_${crypto.randomUUID()}`;
      const username = `wallet_${walletAddress.slice(2, 10)}`;

      const userRecord = {
        userId,
        username,
        email: null,
        passwordHash: null,
        walletAddress: walletAddress.toLowerCase(),
        role: 'user',
        createdAt: new Date().toISOString(),
        verified: true,
        totalTokensEarned: 0,
        totalTokensSpent: 0,
        rewardsMinted: 0
      };

      await this.kv.put(`user:${userId}`, JSON.stringify(userRecord));
      await this.kv.put(`user:wallet:${walletAddress.toLowerCase()}`, userId);
      await this.kv.put(`user:username:${username.toLowerCase()}`, userId);

      // Initialize user profile
      const profile: UserProfile = {
        userId,
        username,
        joinedAt: new Date().toISOString(),
        totalQueries: 0,
        totalInsights: 0,
        favoriteInsightTypes: [],
        platformPreferences: { web: true },
        settings: {
          transparencyLevel: 'detailed',
          autoAwardTokens: true
        }
      };

      await this.kv.put(`user:profile:${userId}`, JSON.stringify(profile));

      return this.createSession(userId, username, undefined, walletAddress);
    } catch {
      return null;
    }
  }

  /**
   * Create or link wallet to account
   */
  async linkWallet(userId: string, walletAddress: string): Promise<boolean> {
    try {
      const userRecord = await this.kv.get(`user:${userId}`, 'json');
      if (!userRecord) return false;

      (userRecord as any).walletAddress = walletAddress;
      await this.kv.put(`user:${userId}`, JSON.stringify(userRecord));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<any | null> {
    try {
      const user = await this.kv.get(`user:${userId}`, 'json');
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Create session
   */
  private async createSession(
    userId: string,
    username: string,
    email?: string,
    walletAddress?: string
  ): Promise<AuthSession> {
    const expiresAt = new Date(Date.now() + this.tokenExpiry).toISOString();
    
    const session: AuthSession = {
      userId,
      username,
      email,
      walletAddress,
      role: 'user',
      createdAt: new Date().toISOString(),
      expiresAt
    };

    // Store session in KV
    const sessionId = crypto.randomUUID();
    await this.kv.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: Math.floor(this.tokenExpiry / 1000) }
    );

    return session;
  }

  /**
   * Verify session
   */
  async verifySession(sessionId: string): Promise<AuthSession | null> {
    try {
      const session = await this.kv.get(`session:${sessionId}`, 'json');
      if (!session) return null;

      const sessionData = session as AuthSession;
      if (new Date(sessionData.expiresAt) < new Date()) {
        await this.kv.delete(`session:${sessionId}`);
        return null;
      }

      return sessionData;
    } catch {
      return null;
    }
  }

  /**
   * Hash password using simple implementation
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.jwtSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.base64url(hashBuffer);
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.jwtSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.base64url(hashBuffer) === hash;
  }

  /**
   * HMAC SHA-256
   */
  private async hmacSha256(message: string, key: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', keyData, encoder.encode(message));
  }

  /**
   * Verify wallet signature using EIP-191
   * This is a simplified version - use ethers.js for production
   */
  private verifyWalletSignature(walletAddress: string, message: string, signature: string): boolean {
    try {
      // In production, use proper EIP-191 verification:
      // const recoveredAddress = ethers.verifyMessage(message, signature);
      // return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      
      // For now, we accept the signature if:
      // 1. Wallet address is valid
      // 2. Signature is valid hex format
      // 3. Message is not empty
      
      const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
      const isValidSignature = /^0x[a-fA-F0-9]{130}$/.test(signature); // 65 bytes = 130 hex chars
      const hasMessage = message && message.length > 0;

      // In production, perform actual signature verification here
      // For now, basic validation only
      return isValidWallet && isValidSignature && (hasMessage ? true : false);
    } catch {
      return false;
    }
  }

  /**
   * Base64 URL encoding
   */
  private base64url(data: string | ArrayBuffer): string {
    let str = '';
    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
    } else {
      str = data;
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64 URL decoding
   */
  private base64urlDecode(str: string): string {
    const padded = str.padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
    return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  }
}
