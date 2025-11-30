# Wallet + Rewards Integration Guide

## Complete User Journey

This document shows how wallet authentication and crypto rewards work together end-to-end.

## Step-by-Step Journey

### Step 1: User Discovers Aura AI

**Landing Page** (`GET /`)
- User sees feature overview
- "Connect Wallet" button prominent
- Or traditional "Sign Up" option

### Step 2: User Connects Wallet

**Wallet Connection**
```javascript
// User clicks "Connect Wallet"
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});
// MetaMask shows: "Aura AI wants to connect to your wallet"
// User clicks "Connect" on their account (e.g., 0x742d...)
```

**Backend: Wallet Signup**
```bash
POST /api/auth/wallet-signup
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```

**Response**:
```json
{
  "success": true,
  "userId": "user_abc123",
  "session": {
    "userId": "user_abc123",
    "username": "wallet_742d",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
    "createdAt": "2025-11-30T12:00:00Z"
  }
}
```

**KV Database State After Signup**:
```
Key: user:user_abc123
Value: {
  userId: "user_abc123",
  username: "wallet_742d",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
  passwordHash: null,
  verified: true,
  totalTokensEarned: 0,
  totalTokensSpent: 0,
  rewardsMinted: 0
}

Key: user:wallet:0x742d35cc6634c0532925a3b844bc59e94fc16f6a
Value: "user_abc123"

Key: user:tokens:user_abc123
Value: {
  userId: "user_abc123",
  balance: 100,
  totalEarned: 100,
  totalSpent: 0,
  lastUpdated: "2025-11-30T12:00:00Z"
}
```

**Frontend State**:
```javascript
localStorage.setItem('authToken', 'user_abc123');
localStorage.setItem('walletAddress', '0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a');
// Redirect to /dashboard
```

### Step 3: User Earns Tokens

**User makes query** (generates insight)
```bash
POST /api/query
{
  "userId": "user_abc123",
  "text": "What's the best way to learn Python?",
  "category": "learning"
}
```

**Backend Processing**:
1. Generate insight using InsightEngine
2. Award tokens: `earnTokens(user_abc123, 25, 'earn_engagement')`
3. Record transaction
4. Update user balance

**KV Updates**:
```
Key: user:tokens:user_abc123
Value: {
  balance: 125,        // was 100 + 25 earned
  totalEarned: 125,    // increased
  totalSpent: 0
}

Key: user:transactions:user_abc123
Value: [
  {
    id: "txn_xyz123",
    userId: "user_abc123",
    type: "earn_engagement",
    amount: 25,
    description: "Insight generation: Python learning",
    timestamp: "2025-11-30T12:05:00Z"
  }
]
```

### Step 4: User Views Rewards Dashboard

**Dashboard** (`GET /dashboard`)
- Shows: 125 AURA balance
- Shows: $0.00 USDC minted so far
- Conversion rate: 1 AURA = 0.1 USDC displayed

**Data Loaded**:
```javascript
GET /api/user/user_abc123

Response:
{
  "user": {
    "userId": "user_abc123",
    "walletAddress": "0x742d35Cc...",
    ...
  },
  "tokens": {
    "balance": 125,
    "totalEarned": 125,
    "totalSpent": 0
  },
  "rewards": [],
  "stats": {
    "totalTokensEarned": 125,
    "totalTokensSpent": 0,
    "rewardsMinted": 0
  }
}
```

### Step 5: User Converts Tokens to USDC

**User Input**:
```
Amount: 100 AURA tokens
Wallet: 0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a
Click: "Convert & Mint Reward"
```

**Frontend Calculation**:
```javascript
GET /api/rewards/calculate
{ "auraTokens": 100 }

Response: { "usdcAmount": 10.0 }
```

**Mint Request**:
```bash
POST /api/rewards/mint
{
  "userId": "user_abc123",
  "auraTokens": 100,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```

### Step 6: Backend Creates Reward

**Mint Process**:
1. Validate: User has 125 AURA, requesting 100 ✓
2. Validate: Wallet address is valid 0x + 40 hex ✓
3. Calculate: 100 × 0.1 = 10.0 USDC
4. Create CryptoReward object
5. **Deduct tokens** from user immediately
6. Add to pending queue

**KV Updates**:
```
Key: reward:reward_xyz789
Value: {
  id: "reward_xyz789",
  userId: "user_abc123",
  auraTokens: 100,
  usdcAmount: 10.0,
  status: "pending",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
  createdAt: "2025-11-30T12:10:00Z"
}

Key: user:tokens:user_abc123
Value: {
  balance: 25,         // was 125 - 100 spent
  totalEarned: 125,
  totalSpent: 100,     // increased
  lastUpdated: "2025-11-30T12:10:00Z"
}

Key: user:transactions:user_abc123
Appended: {
  id: "txn_abc456",
  type: "spend_premium_feature",
  amount: 100,
  description: "Converted to USDC: 10.0",
  timestamp: "2025-11-30T12:10:00Z"
}

Key: rewards:pending
Value: ["reward_xyz789"]

Key: user:rewards:user_abc123
Value: ["reward_xyz789"]
```

**Response to User**:
```json
{
  "success": true,
  "reward": {
    "id": "reward_xyz789",
    "status": "pending",
    "auraTokens": 100,
    "usdcAmount": 10.0,
    "walletAddress": "0x742d35Cc..."
  }
}
```

**Dashboard Now Shows**:
- Balance: 25 AURA (down from 125)
- Pending Rewards: 1
- Status: "pending"

### Step 7: Backend Processes Transaction

**Background Job** (triggered every minute)
```
GET /api/rewards/pending
→ Found: reward_xyz789 with status "pending"

Actions:
1. Update status to "processing"
2. Generate USDC transfer calldata:
   Function: transfer(address to, uint256 amount)
   Recipient: 0x742d35Cc...
   Amount: 10000000 (10 USDC with 6 decimals)
   
3. Create transaction:
   to: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC contract)
   data: 0xa9059cbb + encoded params
   
4. Sign transaction (backend private key)
5. Broadcast to Base RPC
6. Receive tx hash: 0xabc123...
7. Update reward with tx hash
```

**KV Update**:
```
Key: reward:reward_xyz789
Value: {
  ...same as before...,
  status: "processing",
  transactionHash: "0xabc123def456..."
}
```

### Step 8: Blockchain Confirms

**Timeline**: ~12 seconds on Base chain

**Events**:
1. Tx enters mempool (visible on Basescan immediately)
2. Sequencer includes in next block
3. Block produced
4. Base proposes to Ethereum L1
5. L1 confirms (finality)

**User Can Check**:
```
Basescan: https://basescan.org/tx/0xabc123...
Status: Success ✓
From: 0x[backend-wallet]
To: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Value: 10 USDC
```

### Step 9: Backend Marks Complete

**Confirmation Job** (checks every 30 seconds)
```
GET transaction receipt from Base RPC
Check status == 1 (success)

Actions:
1. Update reward status to "completed"
2. Set completedAt timestamp
3. Increment user's rewardsMinted counter
```

**KV Update**:
```
Key: reward:reward_xyz789
Value: {
  ...same as before...,
  status: "completed",
  completedAt: "2025-11-30T12:10:30Z"
}

Key: user:minted-rewards:user_abc123
Value: "10.0"
```

**Dashboard Updates**:
- Pending Rewards: 0
- USDC Minted: $10.00 (new!)
- Reward Status: "completed" with tx link

### Step 10: User Receives USDC

**User's MetaMask Wallet**:
- Balance updates: +10 USDC
- Transaction visible in MetaMask
- Can swap, send, or hold USDC

**User Can**:
- View on Basescan with tx hash
- Withdraw to exchange
- Use for DeFi on Base
- Send to friends

---

## Technical Architecture

### Data Flow Diagram

```
┌─────────────────────┐
│   User Dashboard    │
│  - 125 AURA balance │
│  - "Convert" button │
└──────────┬──────────┘
           │ POST /api/rewards/mint
           ↓
┌─────────────────────────────────────────┐
│      Aura AI Server (Hono)              │
│  ┌───────────────────────────────────┐  │
│  │ 1. Validate user & tokens         │  │
│  │ 2. Create CryptoReward (pending)  │  │
│  │ 3. Deduct tokens from balance     │  │
│  │ 4. Add to pending queue           │  │
│  └───────────────────────────────────┘  │
└──────────┬──────────────────────────────┘
           │ Save to KV
           ↓
┌─────────────────────────────────────────┐
│   Cloudflare KV Store                   │
│  - reward:reward_xyz789 (pending)       │
│  - user:tokens:user_abc123 (25 balance) │
│  - rewards:pending (queue)              │
└──────────┬──────────────────────────────┘
           │ Background job reads pending
           ↓
┌─────────────────────────────────────────┐
│   Backend Processor                     │
│  - Generate transaction                 │
│  - Sign with private key                │
│  - Broadcast to Base RPC                │
└──────────┬──────────────────────────────┘
           │ Signed transaction
           ↓
┌─────────────────────────────────────────┐
│     Base Chain (L2)                     │
│  - Transaction in mempool               │
│  - Included in block                    │
│  - Confirmed on L1                      │
│  - USDC transferred to user wallet      │
└──────────┬──────────────────────────────┘
           │ Update KV with tx hash
           ↓
┌─────────────────────────────────────────┐
│   Cloudflare KV                         │
│  - reward:reward_xyz789 (completed)     │
│  - transactionHash: 0xabc123...         │
└──────────┬──────────────────────────────┘
           │ Dashboard polls /api/user/...
           ↓
┌─────────────────────────────────────────┐
│   User Dashboard Updates                │
│  - Reward status: "completed"           │
│  - USDC Minted: $10.00                  │
│  - Tx hash: clickable to Basescan       │
└─────────────────────────────────────────┘
```

---

## Key Insights

### Why Wallet Auth is Perfect for Rewards

**Traditional Email Auth**:
- User email → password recovery email
- User must trust email provider
- Wallet address not available

**Wallet Auth**:
- User IS their wallet address
- Rewards go directly to wallet
- No intermediary for funds

**Result**: Seamless from login → earning → cashing out

### One Identity = One Wallet

**Model**:
```
Wallet 0x742d... → User ID user_abc123 → AURA balance → USDC rewards
```

**Benefits**:
- Unique identification
- Portable across apps
- Transparent on blockchain
- Auditable history

### Token Lifecycle

```
Earned: +25 AURA → balance increases
Spent: -100 AURA → balance decreases
Minted: -100 AURA → +10 USDC in wallet
```

---

## Testing the Full Flow Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Start server
npm run dev

# Server runs on http://localhost:8787
```

### Test Steps

**1. Signup with Wallet**
```bash
curl -X POST http://localhost:8787/api/auth/wallet-signup \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
  }'

# Response:
# {
#   "success": true,
#   "userId": "user_abc123"
# }
```

**2. Check Initial Balance**
```bash
curl http://localhost:8787/api/user/user_abc123

# Response includes:
# "balance": 100
```

**3. Request Reward Mint**
```bash
curl -X POST http://localhost:8787/api/rewards/mint \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123",
    "auraTokens": 100,
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
  }'

# Response:
# {
#   "success": true,
#   "reward": {
#     "id": "reward_xyz789",
#     "status": "pending",
#     "auraTokens": 100,
#     "usdcAmount": 10.0
#   }
# }
```

**4. Check Updated Balance**
```bash
curl http://localhost:8787/api/user/user_abc123

# Now shows:
# "balance": 0
# "rewards": [{ status: "pending", ... }]
```

**5. Check Reward Status**
```bash
curl http://localhost:8787/api/rewards/reward_xyz789

# Shows pending → processing → completed
```

---

## Production Deployment

### Cloudflare Setup

```toml
# wrangler.toml
[env.production]
vars = { AUTH_SECRET = "your-secret-key" }
```

### Environment Variables

```bash
AUTH_SECRET=your-secret-here
ETHERSCAN_API_KEY=optional-key
BASE_RPC_URL=https://mainnet.base.org
WALLET_PRIVATE_KEY=backend-wallet-key
```

### Deployment

```bash
npm run deploy
```

---

**Aura AI: Earn Real Crypto, Prove it with Your Wallet** ✨
