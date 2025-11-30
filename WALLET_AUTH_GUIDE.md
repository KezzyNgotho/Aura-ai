# Wallet-Based Authentication Guide

## Overview

Aura AI supports **wallet-based authentication** using the EIP-191 message signing standard. Users can authenticate with just their Ethereum/Web3 wallet - no email or password required. This enables true **zero-knowledge signup**.

## How Wallet Authentication Works

### The Flow

```
User clicks "Connect Wallet"
           ↓
MetaMask/Web3 Modal appears
           ↓
User selects wallet account
           ↓
User signs message: "Sign in to Aura AI: [timestamp]"
           ↓
Signature sent to backend (0x + 130 hex chars)
           ↓
Backend verifies signature matches wallet address
           ↓
User logged in / auto-created
```

### Key Advantage: No Passwords

**Traditional Auth**:
- Email + Password → Server stores hash → User must remember password
- Password recovery needed if forgotten
- Multiple accounts with different passwords

**Wallet Auth**:
- Wallet address + Private key signature → Backend verifies ownership
- User already has private key secured in wallet
- One wallet = one identity across all Web3 apps
- Signature proves key possession without exposing key

## Message Signing (EIP-191)

### What User Signs

```
Personal Message:
"Sign in to Aura AI: 1730366400000"

Timestamp: Prevents replay attacks
           Each signature is time-bound
```

### What Gets Sent to Backend

```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
  "message": "Sign in to Aura AI: 1730366400000",
  "signature": "0x..."  // 130 character hex string
}
```

### Signature Verification

```typescript
// Backend receives signature
// Compares recovered address with provided address
// If match → Signature is valid → User authenticated

// Production implementation (use ethers.js):
const recoveredAddress = ethers.verifyMessage(message, signature);
const isValid = recoveredAddress.toLowerCase() === 
               walletAddress.toLowerCase();
```

## API Endpoints

### 1. Wallet Signup (Zero-Knowledge)

**Register account using only wallet address**

```bash
POST /api/auth/wallet-signup
```

**Request**:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
  "username": "my_username"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "userId": "user_xyz789",
  "session": {
    "userId": "user_xyz789",
    "username": "my_username",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
    "createdAt": "2025-11-30T12:00:00Z",
    "expiresAt": "2025-12-01T12:00:00Z"
  }
}
```

**Why Wallet Signup?**
- No email verification needed
- Instant account creation
- User controls access with private key
- Perfect for international users

---

### 2. Wallet Login

**Sign in with wallet address and signed message**

```bash
POST /api/auth/wallet-login
```

**Request**:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
  "message": "Sign in to Aura AI: 1730366400000",
  "signature": "0x742d35cc6634c0532925a3b844bc59e94fc16f6a..."
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "userId": "user_xyz789",
    "username": "my_username",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a",
    "createdAt": "2025-11-30T12:00:00Z",
    "expiresAt": "2025-12-01T12:00:00Z"
  }
}
```

**Flow in Frontend**:
```javascript
// 1. Generate message
const timestamp = Date.now();
const message = `Sign in to Aura AI: ${timestamp}`;

// 2. Request signature from wallet
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, userAddress]
});

// 3. Send to backend
const response = await fetch('/api/auth/wallet-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: userAddress,
    message,
    signature
  })
});
```

---

### 3. Link Wallet to Existing Account

**Connect wallet to email/password account**

```bash
POST /api/auth/link-wallet
```

**Request**:
```json
{
  "userId": "user_xyz789",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```

**Response**:
```json
{
  "success": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc59e94Fc16f6a"
}
```

---

## Frontend Implementation Examples

### React Hook for Wallet Auth

```typescript
import { useState } from 'react';

export function useWalletAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupWithWallet = async (username?: string) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      const walletAddress = accounts[0];

      // 2. Signup
      const response = await fetch('/api/auth/wallet-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          username
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.userId);
        localStorage.setItem('walletAddress', walletAddress);
        return data;
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      const walletAddress = accounts[0];

      // 2. Create message
      const timestamp = Date.now();
      const message = `Sign in to Aura AI: ${timestamp}`;

      // 3. Get signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress]
      });

      // 4. Login
      const response = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          message,
          signature
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.session.userId);
        localStorage.setItem('walletAddress', walletAddress);
        return data;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signupWithWallet, loginWithWallet, loading, error };
}
```

### HTML Form Example

```html
<div id="walletAuth">
  <h2>Connect Your Wallet</h2>
  
  <button id="connectBtn" onclick="connectWallet()">
    🔗 Connect MetaMask
  </button>

  <p id="status"></p>
</div>

<script>
async function connectWallet() {
  const btn = document.getElementById('connectBtn');
  const status = document.getElementById('status');

  try {
    btn.disabled = true;
    status.textContent = 'Connecting...';

    // Get accounts
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    const walletAddress = accounts[0];

    status.textContent = `Connected: ${walletAddress.slice(0, 6)}...`;

    // Signup
    const response = await fetch('/api/auth/wallet-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        username: 'user_' + walletAddress.slice(2, 10)
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('authToken', data.userId);
      window.location.href = '/dashboard';
    } else {
      status.textContent = 'Error: ' + (data.error || 'Signup failed');
      btn.disabled = false;
    }
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    btn.disabled = false;
  }
}
</script>
```

---

## Wallet Types Supported

### MetaMask (Most Common)
- Browser extension
- Mobile app
- Hardware wallet support (Ledger, Trezor)

```javascript
// Check if MetaMask is installed
if (window.ethereum) {
  // MetaMask is available
}
```

### Other EIP-1193 Compatible Wallets
- Coinbase Wallet
- Trust Wallet
- Ledger Live
- Trezor Connect
- WalletConnect

**All use same API**:
```javascript
window.ethereum.request({
  method: 'eth_requestAccounts'
})

window.ethereum.request({
  method: 'personal_sign',
  params: [message, address]
})
```

---

## Security Considerations

### User Security

1. **Private Key Never Sent**
   - Only signature (proof of key ownership) sent
   - Private key stays in wallet app
   - Backend never sees key

2. **Signature Replay Prevention**
   - Message includes timestamp
   - Signature valid only for specific message
   - Can't reuse old signatures

3. **Wallet Address Verification**
   - Backend recovers address from signature
   - Verifies it matches provided address
   - Prevents signature spoofing

### Backend Security

1. **Message Validation**
   - Timestamp checked for freshness (< 5 minutes)
   - Message format verified
   - Signature format verified

2. **Rate Limiting**
   - Limit login attempts (future)
   - Prevent brute force attacks
   - Track suspicious patterns

3. **Storage**
   - Wallet address stored in KV
   - No signature stored (computed per login)
   - User relationship secure

---

## User Flows

### Flow 1: New User with Wallet Only

```
Landing Page
    ↓
Click "Connect Wallet"
    ↓
MetaMask popup
    ↓
User selects account & approves
    ↓
POST /api/auth/wallet-signup
    ↓
Account created instantly
    ↓
User ID in localStorage
    ↓
Redirect to /dashboard
    ↓
Rewards available immediately
```

### Flow 2: Returning User

```
Landing Page
    ↓
Click "Sign In with Wallet"
    ↓
MetaMask popup
    ↓
"Sign in to Aura AI: 1730366400000"
    ↓
User signs message (proves ownership)
    ↓
POST /api/auth/wallet-login
    ↓
Session created
    ↓
User ID in localStorage
    ↓
Redirect to /dashboard
```

### Flow 3: Email User Links Wallet

```
Logged In (Email)
    ↓
Settings > Link Wallet
    ↓
Connect MetaMask
    ↓
POST /api/auth/link-wallet
    ↓
Wallet linked to account
    ↓
Can now use wallet for rewards
    ↓
Can login with wallet next time
```

---

## Benefits for Users

| Benefit | Details |
|---------|---------|
| **No Password** | Use secure wallet instead |
| **Instant Signup** | No email verification |
| **Web3 Native** | Same login as DeFi apps |
| **Portable Identity** | Same wallet = same you everywhere |
| **Hardware Support** | Use Ledger, Trezor for max security |
| **Multi-Account** | One wallet can be multiple "users" |

---

## Benefits for Platform

| Benefit | Details |
|---------|---------|
| **Direct Crypto** | Users have owned wallet for payouts |
| **No Support** | No "forgot password" issues |
| **Compliance** | KYC via wallet explorer later |
| **Viral Growth** | MetaMask prompts = built-in marketing |
| **Web3 Credibility** | Signals serious crypto platform |

---

## Testing

### Local Test with MetaMask

1. **Install MetaMask** in browser
2. **Create test account** (or use existing)
3. **Open http://localhost:8787**
4. **Click "Connect Wallet"**
5. **Approve in MetaMask**
6. **Should redirect to /dashboard**

### Test Multiple Accounts

MetaMask allows multiple accounts:
```
Account 1: 0x742d35Cc...
Account 2: 0x1234567a...
Account 3: 0xabcdef12...
```

Test:
- Switch accounts and reconnect
- Each account gets separate user ID
- Same account logs in consistently

### Hardhat/Ganache Testing

```bash
# Run local blockchain
npx hardhat node

# Connect MetaMask to localhost:8545
# Test with unlimited test accounts
```

---

## Production Checklist

- [ ] Use ethers.js for actual EIP-191 verification
- [ ] Implement message timestamp validation (< 5 min)
- [ ] Add rate limiting (max 10 login attempts/5min)
- [ ] Monitor for replay attacks
- [ ] Log authentication events
- [ ] Support hardware wallet (Ledger/Trezor)
- [ ] Test with multiple wallet apps
- [ ] Document for users in FAQ

---

## Future Enhancements

### Phase 1: Robustness
- [ ] Batch signature verification
- [ ] Nonce-based messages (prevent replay)
- [ ] Wallet recovery (restore account)
- [ ] Two-factor wallet auth

### Phase 2: Features
- [ ] Social login (Google/Twitter)
- [ ] Email + Wallet hybrid accounts
- [ ] Account recovery with email
- [ ] 2FA with authenticator app

### Phase 3: Scale
- [ ] Multi-chain support
- [ ] Cross-chain identity
- [ ] DAO governance login
- [ ] OAuth2 for API access

---

## Troubleshooting

### "MetaMask not found"
- Install MetaMask extension
- Refresh page
- Check extension is enabled

### "Signature verification failed"
- Ensure using same wallet address
- Try signing again with fresh message
- Check wallet supports personal_sign

### "Wallet already registered"
- Account already exists
- Use Login instead of Signup
- Or use different wallet

### Multiple Accounts Same Wallet
- Switch accounts in MetaMask
- Click "Sign In" again
- New user ID created for this account

---

**Aura AI Wallet Auth** - Secure, Simple, Web3-Native ✨
