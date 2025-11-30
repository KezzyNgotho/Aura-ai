# Aura AI - Authentication & Crypto Rewards Guide

## Overview

Aura AI now includes a complete authentication system and real-world crypto rewards mechanism. Users can earn Aura tokens, convert them to USDC stablecoin, and withdraw directly to their Web3 wallet on the Base blockchain.

## System Architecture

### 1. **Authentication System** (`auth-service.ts`)

The authentication service provides:
- **Email/Password Registration & Login**
  - Secure password hashing with SHA-256
  - JWT-style session management
  - Session persistence in KV store

- **Web3 Wallet Integration**
  - Connect MetaMask or any EIP-1193 compatible wallet
  - Link wallet to user account
  - Wallet address stored for reward disbursement

- **Session Management**
  - 24-hour access token expiry
  - 30-day session retention
  - Automatic cleanup of expired sessions

#### Key Methods:
```typescript
signup(req: SignupRequest): Promise<{ userId, session }>
login(email: string, password: string): Promise<AuthSession>
linkWallet(userId: string, walletAddress: string): Promise<boolean>
getUser(userId: string): Promise<UserProfile>
verifySession(sessionId: string): Promise<AuthSession>
```

### 2. **Crypto Rewards Service** (`crypto-rewards-service.ts`)

Converts Aura tokens to real USDC on Base chain.

#### Features:
- **1 AURA = 0.1 USDC** (configurable conversion rate)
- **USDC on Base Chain** (testnet-ready for mainnet)
- **Status Tracking**: pending → processing → completed
- **Transaction Hash** storage for blockchain verification

#### Workflow:
```
User has 100 AURA tokens
→ Requests mint with wallet address (0x...)
→ System creates CryptoReward object (pending)
→ Backend processes transaction (processing)
→ Transaction confirmed on blockchain (completed)
→ User receives 10 USDC in wallet
```

#### Key Methods:
```typescript
requestRewardMint(userId, auraTokens, walletAddress): Promise<CryptoReward>
processReward(rewardId, txHash): Promise<CryptoReward>
completeReward(rewardId): Promise<CryptoReward>
failReward(rewardId, reason): Promise<CryptoReward>
getUserRewards(userId): Promise<CryptoReward[]>
calculateUsdcAmount(auraTokens): number
```

## User Journey

### Step 1: Landing Page
**Route**: `/`

New users land on a professional landing page with:
- Feature overview
- Call-to-action buttons
- Login/signup modal

### Step 2: Authentication

#### Option A: Email/Password
```javascript
POST /api/auth/signup
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password"
}

Response:
{
  "success": true,
  "userId": "user_xxxxx",
  "session": {
    "userId": "user_xxxxx",
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2025-11-30T...",
    "expiresAt": "2025-12-01T..."
  }
}
```

#### Option B: Web3 Wallet
- User clicks "Connect Wallet"
- MetaMask modal appears
- User approves connection
- Wallet address linked to account

### Step 3: Rewards Dashboard
**Route**: `/dashboard`

After login, user sees:
- **Token Balance**: Current AURA tokens available
- **USDC Minted**: Total USDC already withdrawn
- **Pending Rewards**: Conversions in progress

### Step 4: Convert & Mint Rewards

**Endpoint**: `POST /api/rewards/mint`

```javascript
{
  "userId": "user_xxxxx",
  "auraTokens": 100,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}

Response:
{
  "success": true,
  "reward": {
    "id": "reward_xxxxx",
    "userId": "user_xxxxx",
    "auraTokens": 100,
    "usdcAmount": 10.0,
    "status": "pending",
    "walletAddress": "0x742d...",
    "createdAt": "2025-11-30T..."
  }
}
```

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create new account |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/link-wallet` | POST | Connect Web3 wallet |
| `/api/user/:userId` | GET | Get user profile & stats |

### Rewards Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rewards/mint` | POST | Request token-to-USDC conversion |
| `/api/rewards/:rewardId` | GET | Check reward status |
| `/api/rewards/pending` | GET | Get all pending rewards |
| `/api/rewards/conversion-rate` | GET | Get current AURA→USDC rate |
| `/api/rewards/calculate` | POST | Calculate USDC from AURA |

### User Data

Get full user information including token balance and reward history:

```bash
GET /api/user/{userId}

Response:
{
  "user": {
    "userId": "user_xxxxx",
    "username": "john_doe",
    "email": "john@example.com",
    "walletAddress": "0x742d...",
    "createdAt": "2025-11-30T..."
  },
  "tokens": {
    "userId": "user_xxxxx",
    "balance": 150,
    "totalEarned": 250,
    "totalSpent": 100,
    "lastUpdated": "2025-11-30T..."
  },
  "rewards": [
    {
      "id": "reward_xxxxx",
      "userId": "user_xxxxx",
      "auraTokens": 100,
      "usdcAmount": 10.0,
      "status": "completed",
      "transactionHash": "0xabc...",
      "createdAt": "2025-11-30T...",
      "completedAt": "2025-11-30T..."
    }
  ],
  "stats": {
    "totalTokensEarned": 250,
    "totalTokensSpent": 100,
    "rewardsMinted": 50.0
  }
}
```

## Configuration

### Environment Variables

Set in `wrangler.jsonc` or Cloudflare environment:

```json
{
  "env": {
    "production": {
      "vars": {
        "AUTH_SECRET": "your-secret-key-here",
        "ETHERSCAN_API_KEY": "optional-for-verification",
        "BASE_RPC_URL": "https://mainnet.base.org",
        "WALLET_PRIVATE_KEY": "backend-wallet-for-disbursement"
      }
    }
  }
}
```

### Conversion Rate

Default: **1 AURA = 0.1 USDC** (10 cents)

To update (admin endpoint - not yet implemented):
```bash
POST /api/admin/rewards/conversion-rate
{
  "auraToUsdc": 0.15
}
```

## Security Considerations

### Authentication
- Passwords hashed with SHA-256 + salt
- Sessions stored in Cloudflare KV with TTL
- JWT-style tokens with expiration
- HTTPS-only in production

### Wallet Integration
- Uses standard EIP-1193 (MetaMask)
- No private keys stored client-side
- User-initiated signing only
- Address verified on every transaction

### Crypto Rewards
- USDC transactions verified on-chain
- Transaction hash stored for auditing
- Failed transactions marked and recoverable
- Pending rewards persist across sessions

## Frontend Integration

### Landing Page
The landing page includes:
- Login/signup forms with validation
- Web3 wallet connection button
- Feature showcase
- Call-to-action buttons

### Rewards Dashboard
The dashboard includes:
- Real-time token balance display
- Conversion calculator
- Reward history table
- Wallet management
- Transaction status tracking

## Blockchain Integration

### USDC on Base Chain

**Token**: USDC (Circle's stablecoin)
**Contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
**Chain**: Base (Layer 2 of Ethereum)
**Decimals**: 6

### Transaction Flow

```
1. User requests mint in dashboard
   ↓
2. System validates wallet address
   ↓
3. CryptoReward created (pending)
   ↓
4. Backend transaction processor:
   - Constructs USDC transfer calldata
   - Signs with backend wallet
   - Broadcasts to Base RPC
   ↓
5. Transaction in mempool (processing)
   ↓
6. Block confirmation (~12 seconds)
   ↓
7. Mark as completed in KV
   ↓
8. User receives USDC in wallet
```

## Testing

### Local Testing

1. **Start server**:
```bash
npm run dev
```

2. **Sign up**:
```bash
curl -X POST http://localhost:8787/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

3. **Request reward**:
```bash
curl -X POST http://localhost:8787/api/rewards/mint \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xxxxx",
    "auraTokens": 100,
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
  }'
```

4. **Check status**:
```bash
curl http://localhost:8787/api/user/user_xxxxx
```

### MetaMask Testing

1. Install MetaMask extension
2. Create test account
3. Navigate to `/dashboard`
4. Click "Connect Wallet"
5. Approve in MetaMask modal
6. Wallet address now auto-filled in conversion form

## Future Enhancements

### Phase 1: Production Hardening
- [ ] Email verification
- [ ] Password reset flow
- [ ] 2FA support
- [ ] Rate limiting
- [ ] Webhook confirmations from blockchain

### Phase 2: Advanced Features
- [ ] Referral rewards
- [ ] Tiered conversion rates (loyalty)
- [ ] Staking system
- [ ] Governance tokens
- [ ] DAO integration

### Phase 3: Scale
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Multiple stablecoin options
- [ ] Automated reward distribution
- [ ] Tax reporting tools
- [ ] Enterprise API

## Troubleshooting

### "Invalid wallet address"
- Ensure address starts with `0x`
- Ensure address is 42 characters total
- Try copying from MetaMask again

### "Insufficient tokens"
- Check token balance in dashboard
- Ensure you've earned enough AURA
- Try smaller conversion amount

### "Transaction failed"
- Check Base network status
- Ensure wallet has some ETH for gas
- Contact support for retry

### "MetaMask not found"
- Install MetaMask extension
- Refresh page
- Use login with email/password instead

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review transaction history for failed rewards
3. Contact support@aura-ai.com
4. Check blockchain explorer for TX hash

---

**Aura AI** - Transform Data Into Real Value ✨
