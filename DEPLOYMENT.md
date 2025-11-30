# ThirdWeb Contract Deployment Guide

## Overview

This guide explains how to deploy the AURA AI smart contracts to multiple blockchains using ThirdWeb.

**Supported Networks:**
- ✅ Arbitrum Sepolia (Testnet) - Recommended for testing
- ✅ Base (Mainnet)
- ✅ Optimism (Mainnet)
- ✅ Arbitrum One (Mainnet)
- ✅ Polygon (Mainnet)

## Prerequisites

1. **Node.js** (v18+) - Already installed ✓
2. **ThirdWeb CLI** - Already installed ✓
3. **ThirdWeb Secret Key** - For CLI authentication
4. **Private Key** - Your deployment wallet (with native gas tokens)
5. **RPC Endpoints** - Already configured ✓
6. **Gas Funds** - ETH/native tokens for deployment

**What you need:**
- ✅ THIRDWEB_SECRET_KEY (get from https://thirdweb.com/team/~/~/)
- ✅ PRIVATE_KEY (your wallet's private key with 0x prefix)

## Setup Steps

### Step 1: Get ThirdWeb Secret Key

1. Go to https://thirdweb.com/team/~/~/
2. Click "API Keys" in the sidebar
3. Click "Create API Key"
4. Copy the generated secret key

### Step 2: Prepare Your Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add both keys:

```
THIRDWEB_SECRET_KEY=your_secret_key_from_dashboard
PRIVATE_KEY=0x1234567890abcdef...
```

**⚠️ SECURITY:**
- Never commit `.env` to version control
- Use a dedicated deployment wallet (not your main wallet)
- Keep your keys secure
- Add `.env` to `.gitignore` (already done)

### Step 3: Fund Your Deployment Wallet

You need gas tokens for deployment:

**For Testnet (Arbitrum Sepolia):**
1. Go to https://faucet.arbitrum.io/
2. Paste your wallet address
3. Claim test ETH

**For Mainnet:**
- Transfer enough ETH to cover gas fees
- Gas estimates: ~$50-200 per contract depending on network

### Step 4: Deploy to Testnet (Recommended First)

Deploy all contracts to Arbitrum Sepolia for testing:

```bash
npm run deploy:contracts:testnet
```

This will:
1. Open ThirdWeb interactive CLI
2. Show contract selection
3. Confirm constructor parameters
4. Display gas estimates
5. Execute deployment
6. Show contract addresses and explorer links

**Expected Output:**
```
✓ AuraToken deployed to: 0x1234...5678
✓ RewardsMinter deployed to: 0xabcd...ef00
✓ TokenConverter deployed to: 0x9999...0000
✓ AgentMarketplace deployed to: 0x8888...1111
```

### Step 5: Configure Constructor Parameters

When deploying, you'll be asked for constructor parameters:

#### AuraToken
- No constructor parameters needed
- Automatically mints 10M tokens to deployer

#### RewardsMinter
- `_auraToken`: Address of AuraToken contract (from step 4)
- `_usdc`: USDC token address on the chain:
  - Sepolia: No USDC testnet yet
  - Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - Optimism: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`
  - Arbitrum: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F86`
  - Polygon: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

#### TokenConverter
- `_auraToken`: Address of AuraToken contract
- `_usdc`: Address of USDC token on the chain (same as RewardsMinter)

#### AgentMarketplace
- `_auraToken`: Address of AuraToken contract

### Step 6: Link Contracts

After deployment, authorize contracts to interact:

```bash
# Add RewardsMinter as authorized minter in AuraToken
# AuraToken.addMinter(RewardsMinterAddress)

# Add initial USDC liquidity to TokenConverter
# TokenConverter.depositUsdcReserve(1000000e6) # 1M USDC

# Fund marketplace with initial AURA for operations
# AuraToken.transfer(AgentMarketplaceAddress, 100000e18) # 100k AURA
```

### Step 7: Deploy to Production (After Testing)

Once tested on Sepolia, deploy to mainnet chains:

```bash
# Deploy to Base (recommended primary chain)
npm run deploy:contracts:base

# Deploy to other chains
npm run deploy:contracts:optimism
npm run deploy:contracts:arbitrum
npm run deploy:contracts:polygon
```

## Deployment Checklist

- [ ] Environment variables set (.env created)
- [ ] Wallet funded with gas tokens
- [ ] Deploy to testnet first
- [ ] Verify contracts on block explorers
- [ ] Test contract interactions
- [ ] Update frontend with contract addresses
- [ ] Deploy to mainnet
- [ ] Verify mainnet deployments
- [ ] Monitor contract interactions

## Contract Verification

After deployment, verify contracts on block explorers:

### For Arbitrum Sepolia
1. Go to https://sepolia.arbiscan.io/
2. Search for contract address
3. Click "Verify and Publish"
4. Select: Solidity (Single File)
5. Upload contract source code

### For Base
1. Go to https://basescan.org/
2. Same verification process

## Interacting with Deployed Contracts

### Via ThirdWeb Dashboard
1. Go to https://thirdweb.com/dashboard
2. Connect your wallet
3. Navigate to deployed contracts
4. Call functions from web UI

### Via Frontend Code

Update `src/aura-ai-server.ts` with deployed contract addresses:

```typescript
const CONTRACTS = {
  auraToken: '0x...', // From deployment
  rewardsMinter: '0x...',
  tokenConverter: '0x...',
  agentMarketplace: '0x...',
};
```

Then use Web3 calls:

```typescript
// Example: Mint rewards
const tx = await rewardsMinterContract.call('mintQueryReward', [userAddress]);
```

### Via Command Line (Cast/Foundry)

```bash
# Check balance
cast call 0xContractAddress "balanceOf(address)(uint256)" 0xUserAddress --rpc-url <RPC>

# Call function
cast send 0xContractAddress "mintReward(address)" 0xUserAddress --private-key $PRIVATE_KEY --rpc-url <RPC>
```

## Gas Optimization Tips

1. **Deploy to Base** - Cheapest L2 currently (~0.01 ETH per contract)
2. **Bundle Transactions** - Deploy during low network activity
3. **Optimize Constructor** - Fewer state writes = cheaper deployment
4. **Consider Proxy Pattern** - For upgradeable contracts (advanced)

## Troubleshooting

### "Insufficient Funds" Error
- Add more gas tokens to deployment wallet
- Check current gas prices
- Try deploying during low activity

### "Invalid Private Key" Error
- Ensure PRIVATE_KEY starts with `0x`
- Check key format in .env file
- Verify wallet has funds

### "Contract Already Deployed" Error
- Check deployment hash exists
- Create new deployment to different chain
- Or use existing contract address

### "Constructor Parameters Mismatch"
- Verify contract addresses are correct
- Check address format (should be 0x...)
- Ensure USDC token exists on that chain

## Monitoring Deployments

Check deployment status:

```bash
# View all deployments
npx thirdweb deploy list

# Get deployment details
npx thirdweb deploy info <contract-address>
```

## Next Steps

1. ✅ Deploy to testnet (Arbitrum Sepolia)
2. ✅ Verify contracts on explorer
3. ✅ Test contract interactions
4. ⏳ Integrate with frontend
5. ⏳ Deploy to mainnet
6. ⏳ Monitor live contracts
7. ⏳ Set up automated rewards

## Resources

- **ThirdWeb Docs**: https://docs.thirdweb.com/
- **Arbitrum Docs**: https://docs.arbitrum.io/
- **Base Docs**: https://docs.base.org/
- **Optimism Docs**: https://docs.optimism.io/
- **Polygon Docs**: https://wiki.polygon.technology/
- **OpenZeppelin**: https://docs.openzeppelin.com/

## Support

For deployment issues:
- Check ThirdWeb Discord: https://discord.gg/thirdweb
- Review Solidity errors on contract file
- Verify constructor parameters
- Check RPC endpoint status

---

**Deployment Command Quick Reference:**

```bash
npm run deploy:contracts              # Interactive deployment
npm run deploy:contracts:testnet      # Deploy to Arbitrum Sepolia
npm run deploy:contracts:base         # Deploy to Base
npm run deploy:contracts:optimism     # Deploy to Optimism
npm run deploy:contracts:arbitrum     # Deploy to Arbitrum One
npm run deploy:contracts:polygon      # Deploy to Polygon
```
