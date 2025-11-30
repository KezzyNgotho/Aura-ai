# Crypto Rewards System - Technical Deep Dive

## Overview

The Aura AI crypto rewards system converts in-app tokens (AURA) to real-world cryptocurrency (USDC) on the Base blockchain. This document explains the complete technical flow.

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Application                         │
│  (Web Dashboard / Mobile App)                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Aura AI Server (Hono)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Auth Service                                         │  │
│  │     - Email/Password login                              │  │
│  │     - Wallet-based login (EIP-191)                     │  │
│  │     - Session management                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  2. Token Economy Service                                │  │
│  │     - Track AURA token balance                           │  │
│  │     - Deduct tokens when minting rewards                │  │
│  │     - Log transactions                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  3. Crypto Rewards Service                               │  │
│  │     - Calculate AURA→USDC conversion                     │  │
│  │     - Create reward mint requests                        │  │
│  │     - Track reward status (pending→processing→completed) │  │
│  │     - Generate blockchain transaction data               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │   Cloudflare KV Store          │
        │   (Persistent Storage)         │
        │                                │
        │  - User accounts               │
        │  - Token balances              │
        │  - Reward requests             │
        │  - Transaction history         │
        └────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │  Backend Processor             │
        │  (Separate service - future)   │
        │                                │
        │  - Sign transactions           │
        │  - Broadcast to Base RPC       │
        │  - Monitor confirmation        │
        │  - Update KV status            │
        └────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │    Base Chain (L2)             │
        │    USDC Contract               │
        │    0x833589fCD6...             │
        │                                │
        │  ERC-20 Token Transfer         │
        │  User Wallet ← 10 USDC         │
        └────────────────────────────────┘
```

## Reward Minting Flow

### Phase 1: Request Initiation (User → Server)

**User Action**: Click "Convert & Mint" on dashboard

**API Call**:
```javascript
POST /api/rewards/mint
{
  "userId": "user_abc123",
  "auraTokens": 100,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```

**Server Steps**:
1. Validate user session
2. Check user has 100+ AURA tokens
3. Validate wallet address format
4. Calculate USDC amount: `100 * 0.1 = 10 USDC`
5. Create `CryptoReward` object in KV:
   ```json
   {
     "id": "reward_xyz789",
     "userId": "user_abc123",
     "auraTokens": 100,
     "usdcAmount": 10.0,
     "status": "pending",
     "walletAddress": "0x742d...",
     "createdAt": "2025-11-30T12:00:00Z",
     "metadata": { "platform": "base" }
   }
   ```
6. **Deduct tokens** from user balance:
   - Before: `{ balance: 150, totalEarned: 250, totalSpent: 100 }`
   - After: `{ balance: 50, totalEarned: 250, totalSpent: 200 }`
7. Add reward to pending queue
8. Return reward ID to user

**Response**:
```json
{
  "success": true,
  "reward": {
    "id": "reward_xyz789",
    "status": "pending",
    "auraTokens": 100,
    "usdcAmount": 10.0
  }
}
```

### Phase 2: Processing (Backend Processor)

**Trigger**: Backend monitor detects pending rewards in KV queue

**Steps**:
1. Fetch reward from KV: `reward:reward_xyz789`
2. Update status to `processing`:
   ```json
   {
     ...same reward...,
     "status": "processing"
   }
   ```
3. Generate blockchain transaction:
   ```typescript
   // USDC transfer calldata
   const callData = generateTransferCallData(
     "0x742d...",  // recipient wallet
     10000000      // 10 USDC (with 6 decimals)
   );
   
   // Result:
   {
     "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  // USDC contract
     "data": "0xa9059cbb" +  // transfer() function selector
             "742d35cc6634c0532925a3b844bc59e94fc16f6a" +  // padded recipient
             "00989680",  // amount (10 USDC in wei)
     "value": "0"
   }
   ```
4. Sign transaction with backend private key
5. Broadcast to Base RPC:
   ```bash
   https://mainnet.base.org
   # or testnet: https://sepolia.base.org
   ```
6. Receive transaction hash: `0xabc123...`
7. Update reward with tx hash:
   ```json
   {
     ...same reward...,
     "transactionHash": "0xabc123..."
   }
   ```

### Phase 3: Confirmation (Blockchain)

**Timeline**: ~12 seconds for 1 block confirmation on Base

**Events**:
1. Transaction enters mempool (pending)
2. Sequencer includes in next block
3. Block proposed to L1 (Ethereum)
4. L1 confirmation finalizes on Base
5. Transaction marked "confirmed"

### Phase 4: Completion (Update KV)

**Trigger**: Backend detects transaction confirmation

**Steps**:
1. Query transaction receipt from Base RPC
2. Verify transaction succeeded (status = 1)
3. Update reward status to `completed`:
   ```json
   {
     ...same reward...,
     "status": "completed",
     "completedAt": "2025-11-30T12:00:30Z"
   }
   ```
4. Increment user's `rewardsMinted` counter
5. Emit success event to user (optional webhook)

### Phase 5: User Receives Funds

**Timeline**: ~2-5 minutes after completion

**User's Wallet**:
- Balance increases by 10 USDC
- Token contract shows transfer in transaction history
- Can swap, send, or hold USDC

**User Dashboard**:
- Reward marked as "completed"
- Transaction hash clickable to Basescan
- New USDC amount reflected in stats

## Conversion Rate Mechanics

### Default Rate
```
1 AURA = 0.1 USDC
```

### Calculation
```
usdcAmount = auraTokens * conversionRate

Example:
- 100 AURA × 0.1 = 10 USDC
- 500 AURA × 0.1 = 50 USDC
- 1000 AURA × 0.1 = 100 USDC
```

### Updating Rate (Admin)
```typescript
// Current implementation - stored in CryptoRewardsService
private conversionRate = { auraToUsdc: 0.1 }

// Future: Database-backed with history
// POST /api/admin/rewards/rate
// { "auraToUsdc": 0.15 }
```

### Why 0.1?
- **Fair value alignment**: 10 AURA for user engagement = 1 cent USD value
- **Token scarcity**: Users earn ~10-50 AURA per insight
- **Incentive alignment**: Meaningful but not excessive payouts
- **Sustainable economics**: Platform can afford disbursement

## Data Structures

### CryptoReward Object (KV Key: `reward:{id}`)
```typescript
{
  id: string;                           // reward_xyz789
  userId: string;                       // user_abc123
  auraTokens: number;                   // 100
  usdcAmount: number;                   // 10.0
  transactionHash?: string;             // 0xabc123...
  status: 'pending' | 'processing' | 'completed' | 'failed';
  walletAddress: string;                // 0x742d...
  createdAt: string;                    // ISO timestamp
  completedAt?: string;                 // ISO timestamp
  metadata?: {
    platform: string;                   // 'base'
    failReason?: string;                // if status = failed
  };
}
```

### User Tokens Object (KV Key: `user:tokens:{userId}`)
```typescript
{
  userId: string;                       // user_abc123
  balance: number;                      // 50 (after mint)
  totalEarned: number;                  // 250 (cumulative)
  totalSpent: number;                   // 200 (after mint)
  lastUpdated: string;                  // ISO timestamp
}
```

### Pending Rewards Queue (KV Key: `rewards:pending`)
```typescript
[
  "reward_xyz789",
  "reward_abc456",
  "reward_def012"
]
```

### User Rewards List (KV Key: `user:rewards:{userId}`)
```typescript
[
  "reward_xyz789",
  "reward_abc456",
  "reward_def012"
]
```

## Error Handling

### Insufficient Balance
```json
{
  "error": "Insufficient tokens",
  "userBalance": 50,
  "requested": 100
}
```
**Action**: User must earn more AURA tokens first

### Invalid Wallet Address
```json
{
  "error": "Invalid wallet address",
  "example": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```
**Action**: Validate address format (0x + 40 hex chars)

### Transaction Failed
```json
{
  "id": "reward_xyz789",
  "status": "failed",
  "metadata": {
    "failReason": "Insufficient contract balance"
  }
}
```
**Action**: Backend refunds AURA tokens to user, retry or contact support

## Security Considerations

### User-Level Security
1. **Session validation**: Check auth token on every request
2. **Wallet validation**: Ensure 0x prefix + 40 hex characters
3. **Amount validation**: Check sufficient AURA before deduction
4. **Rate limiting**: Prevent abuse (future enhancement)

### Backend Security
1. **Private key management**: Stored in Cloudflare environment variables
2. **Transaction signing**: Only backend can create valid signatures
3. **Nonce management**: Prevent double-spending (future enhancement)
4. **Gas price optimization**: Monitor Base chain gas to minimize costs

### Blockchain Security
1. **Smart contract**: Audited USDC contract by Circle
2. **L2 security**: Base inherits Ethereum security
3. **Transaction finality**: Confirmed on Ethereum Layer 1
4. **Immutable record**: All transactions on-chain, auditable

## Testing Checklist

### Local Development
- [ ] User can request mint with valid wallet
- [ ] Tokens deducted immediately
- [ ] Reward created in KV with "pending" status
- [ ] User can view pending rewards
- [ ] Calculate endpoint returns correct USDC amount

### Integration Testing
- [ ] User signup → token creation → reward request flow
- [ ] Multiple users can mint simultaneously
- [ ] Failed transactions marked and recoverable
- [ ] Transaction hash stored correctly
- [ ] User balance updates correctly

### Mainnet Testing (Before Production)
- [ ] Testnet USDC transfer executes
- [ ] Transaction appears on Basescan
- [ ] User receives funds in wallet
- [ ] KV state matches blockchain state
- [ ] Rewards history populated correctly

## Monitoring & Observability

### Metrics to Track
```
- Reward requests per hour
- Average conversion time (pending → completed)
- Success rate (% completed vs failed)
- Total USDC disbursed
- User adoption (% earning rewards)
- Gas costs per transaction
```

### Error Logs
```
- Failed transaction hashes
- Invalid wallet addresses (fraud detection)
- KV write failures
- RPC connection errors
- Processing delays > 5 minutes
```

### User Notifications (Future)
```
- Email: "Your 10 USDC reward is pending"
- Dashboard: Real-time status updates
- Mobile: Push notification on completion
- Blockchain: Block explorer link
```

## Future Enhancements

### Phase 1: Robustness
- [ ] Multi-signature backend wallet
- [ ] Withdrawal whitelist (user verified addresses)
- [ ] Email verification before first withdrawal
- [ ] Rate limiting (max $1000/day per user)

### Phase 2: Features
- [ ] Multiple chains (Ethereum, Polygon, Optimism)
- [ ] Alternative stablecoins (USDT, DAI)
- [ ] Instant vs Standard withdrawal (fast = 1% fee)
- [ ] Staking AURA for higher conversion rates

### Phase 3: Scale
- [ ] Batch processing (multiple users per tx)
- [ ] MEV protection (Flashbots)
- [ ] Liquidity optimization (best routing)
- [ ] Tax reporting integration
- [ ] Governance (DAO control of rates)

---

**Key Insight**: This system combines off-chain speed and cost efficiency with on-chain transparency and trustlessness. Users get real, auditable ownership of cryptocurrency.
