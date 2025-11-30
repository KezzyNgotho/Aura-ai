# 🚀 ThirdWeb Integration Guide

Complete guide for deploying AURA AI smart contracts to multiple blockchains using ThirdWeb.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Verification](#verification)
6. [Frontend Integration](#frontend-integration)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### For Experienced Developers

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 2. Deploy to testnet
npm run deploy:contracts:testnet

# 3. Extract ABIs for frontend
npm run contracts:extract-abis

# 4. Update contract addresses in src/contracts/deployments.abi.ts

# 5. Test on mainnet
npm run deploy:contracts:base
```

### For First-Time Users

Follow the [Installation](#installation) and [Deployment](#deployment) sections below.

## Installation

### Prerequisites

- ✅ Node.js v18+
- ✅ npm or yarn
- ✅ Git
- ✅ A wallet with private key
- ✅ Some native gas tokens (for deployment)

### Step 1: Install Dependencies

ThirdWeb CLI and SDK are already installed in this project:

```bash
npm install
```

Verify installation:

```bash
npx thirdweb --version
```

### Step 2: Check Contract Files

All contracts should be in `/contracts`:

```bash
ls -la contracts/
# Output:
# AuraToken.sol
# RewardsMinter.sol
# TokenConverter.sol
# AgentMarketplace.sol
```

## Configuration

### Environment Setup

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` and add **only** your private key:

```env
# That's it! Only PRIVATE_KEY is needed.
# No Client ID, API Key, or Secret Key required.
PRIVATE_KEY=0x1234567890abcdef...
```

**NOTE:** You do NOT need:
- ❌ ThirdWeb Client ID
- ❌ ThirdWeb Secret Key
- ❌ ThirdWeb API Key
- ❌ Any ThirdWeb dashboard credentials

The ThirdWeb CLI uses your wallet's private key directly to deploy contracts.

### Network Configuration

Network configurations are in `thirdweb.json`:

```json
{
  "chain_configs": {
    "arbitrum-sepolia": { ... },
    "base": { ... },
    "optimism": { ... },
    "arbitrum": { ... },
    "polygon": { ... }
  }
}
```

All networks are pre-configured with:
- ✅ RPC URLs
- ✅ Chain IDs
- ✅ Block explorers
- ✅ Gas price multipliers

## Deployment

### Network Selection

Choose the appropriate network for your use case:

| Network | Type | Recommended For | Gas Cost |
|---------|------|-----------------|----------|
| Arbitrum Sepolia | Testnet | **Testing & Development** | Low (free) |
| Base | Mainnet | **Primary Production** | Very Low |
| Optimism | Mainnet | Alternative Production | Very Low |
| Arbitrum One | Mainnet | Alternative Production | Very Low |
| Polygon | Mainnet | Alternative Production | Medium |

### Deployment Commands

#### Deploy to Testnet (Recommended First)

```bash
npm run deploy:contracts:testnet
```

This deploys to **Arbitrum Sepolia** for safe testing.

#### Deploy to Mainnet

After testing on testnet, deploy to production chains:

```bash
# Deploy to Base (recommended primary chain)
npm run deploy:contracts:base

# Deploy to other mainnet chains
npm run deploy:contracts:optimism
npm run deploy:contracts:arbitrum
npm run deploy:contracts:polygon
```

#### Interactive Deployment

For full control, use the interactive deployment:

```bash
npm run deploy:contracts
```

This opens an interactive CLI where you can:
1. ✓ Select which contracts to deploy
2. ✓ Choose the network
3. ✓ Review constructor parameters
4. ✓ Confirm gas estimates
5. ✓ Execute deployment

### Deployment Process

When you run a deployment command:

```
ThirdWeb CLI will:
1. Load your contracts from /contracts
2. Compile contract source code
3. Request constructor parameters:
   - AuraToken: (none)
   - RewardsMinter: [auraTokenAddress, usdcTokenAddress]
   - TokenConverter: [auraTokenAddress, usdcTokenAddress]
   - AgentMarketplace: [auraTokenAddress]
4. Calculate gas estimates
5. Display deployment preview
6. Ask for confirmation
7. Deploy to blockchain
8. Show contract addresses and explorer links
```

### Example Deployment Output

```
✓ Compiling contracts...
✓ AuraToken.sol compiled successfully

Network: Arbitrum Sepolia (Chainid: 421614)
RPC: https://sepolia-rollup.arbitrum.io/rpc
Account: 0x1234...5678
Balance: 1.5 ETH

Constructor Parameters:
  - None required

Gas Estimate: ~2,500,000 wei (~$0.50)

✓ Deploying AuraToken.sol...
✓ Contract deployed!

Address: 0xabcd...ef00
Tx Hash: 0x9999...1111
Explorer: https://sepolia.arbiscan.io/address/0xabcd...ef00

Ready for next contract: RewardsMinter
(Note: You'll need the AuraToken address from above)
```

## Verification

### Step 1: Verify Contracts Deployed

Check deployment addresses in your terminal output or in ThirdWeb dashboard:

```bash
# ThirdWeb Dashboard
# https://thirdweb.com/dashboard/contracts
```

### Step 2: Verify on Block Explorers

For each deployed contract, verify the source code:

#### For Arbitrum Sepolia

1. Go to https://sepolia.arbiscan.io/
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Select "Solidity (Single File)"
6. Copy/paste contract source from `/contracts/[ContractName].sol`
7. Select compiler version: `0.8.19`
8. Select optimization: `Yes, 200 runs`
9. Submit

#### For Base

1. Go to https://basescan.org/
2. Follow same process as above

#### For Other Networks

- **Optimism**: https://optimistic.etherscan.io/
- **Arbitrum One**: https://arbiscan.io/
- **Polygon**: https://polygonscan.com/

### Step 3: Check Constructor Parameters

In block explorer, verify that constructor parameters match what you provided.

## Frontend Integration

### Step 1: Extract Contract ABIs

Generate TypeScript files with contract ABIs for frontend use:

```bash
npm run contracts:extract-abis
```

This creates:
- `src/contracts/AuraToken.abi.ts`
- `src/contracts/RewardsMinter.abi.ts`
- `src/contracts/TokenConverter.abi.ts`
- `src/contracts/AgentMarketplace.abi.ts`
- `src/contracts/deployments.abi.ts`
- `src/contracts/index.ts`

### Step 2: Update Deployment Addresses

Edit `src/contracts/deployments.abi.ts` with your contract addresses:

```typescript
export const DEPLOYED_CONTRACTS = {
  "arbitrum-sepolia": {
    AuraToken: "0xabcd...ef00",        // From deployment
    RewardsMinter: "0x1234...5678",
    TokenConverter: "0x9999...0000",
    AgentMarketplace: "0x8888...1111",
  },
  base: {
    AuraToken: "0x...",
    RewardsMinter: "0x...",
    TokenConverter: "0x...",
    AgentMarketplace: "0x...",
  },
  // ... other networks
};
```

### Step 3: Use Contracts in Frontend

```typescript
import {
  AuraTokenABI,
  RewardsMinterFunctions,
  getContractAddress,
  type ChainName,
} from "@/contracts";

// Get contract address for current chain
const auraTokenAddress = getContractAddress("arbitrum-sepolia", "AuraToken");

// Use ABI with Web3.js or ethers.js
const contract = new ethers.Contract(
  auraTokenAddress,
  AuraTokenABI,
  signer
);

// Call contract functions
const balance = await contract.balanceOf(userAddress);

// Send transactions
const tx = await contract.transfer(recipientAddress, amount);
await tx.wait();
```

### Step 4: Update Backend

Update `src/aura-ai-server.ts` with deployed contract addresses:

```typescript
const CONTRACTS = {
  "arbitrum-sepolia": {
    auraToken: "0xabcd...ef00",
    rewardsMinter: "0x1234...5678",
    tokenConverter: "0x9999...0000",
    agentMarketplace: "0x8888...1111",
  },
  // ... other networks
};

// Use in reward minting
const rewardMinterAddress = CONTRACTS[selectedChain].rewardsMinter;
```

## Monitoring

### Monitor Deployments

```bash
# List all deployments
npx thirdweb deploy list

# Get specific deployment info
npx thirdweb deploy info <contract-address>
```

### Monitor Contract Interactions

Use block explorers to monitor:

1. **Transactions**: https://[explorer]/tx/0x...
2. **Contract Events**: View "Logs" tab
3. **Token Transfers**: View "Token Transfers" tab
4. **Account Balance**: View account on explorer

### Gas Cost Tracking

```bash
# Estimate gas for deployment
# Shown before confirmation in CLI

# Example costs (approximate):
# - AuraToken: ~0.3 ETH on Ethereum, ~0.01 ETH on Base
# - RewardsMinter: ~0.5 ETH on Ethereum, ~0.02 ETH on Base
# - TokenConverter: ~0.6 ETH on Ethereum, ~0.03 ETH on Base
# - AgentMarketplace: ~0.8 ETH on Ethereum, ~0.04 ETH on Base
```

## Troubleshooting

### Common Issues

#### "PRIVATE_KEY is not set"

```bash
# Error: Missing PRIVATE_KEY in .env
Solution:
1. Create .env file from .env.example
2. Add your private key with 0x prefix
3. Ensure .env is in project root
```

#### "Insufficient funds for deployment"

```bash
Solution:
1. Check wallet balance: https://[block-explorer]/address/0x...
2. Get testnet funds: https://faucet.arbitrum.io/ (Sepolia)
3. Add more gas tokens to wallet
4. Try deploying to cheaper network (Base < Optimism < Arbitrum < Polygon)
```

#### "Contract already exists"

```bash
Solution:
1. Use different wallet address
2. Deploy to different network
3. Or use existing contract address
4. Check deployment history on ThirdWeb dashboard
```

#### "Constructor parameters mismatch"

```bash
Error: Invalid address format
Solution:
1. Ensure all addresses start with "0x"
2. Verify addresses are correct from previous deployment
3. Check USDC token exists on that chain
4. Verify address checksum is correct
```

#### "RPC rate limit exceeded"

```bash
Solution:
1. Wait a few minutes and retry
2. Switch to different RPC endpoint
3. Use ThirdWeb's RPC (added automatically)
4. Configure custom RPC in thirdweb.json
```

#### "Contract verification failed"

```bash
Solution:
1. Ensure exact Solidity version matches: ^0.8.19
2. Use same optimizer settings: 200 runs
3. Don't use "Single File" if contract has imports
4. Use "Multi-Part" upload or "Flattened File"
5. To flatten: truffle-flattener or online tool
```

### Getting Help

1. **ThirdWeb Documentation**: https://docs.thirdweb.com/
2. **ThirdWeb Discord**: https://discord.gg/thirdweb
3. **Solidity Issues**: Review contract for syntax errors
4. **Network Issues**: Check RPC endpoint status on https://chainlist.org/

## Advanced Topics

### Multi-Chain Deployment

Deploy to all networks automatically (for advanced users):

```bash
# Manual deployment to each network
npm run deploy:contracts:testnet
npm run deploy:contracts:base
npm run deploy:contracts:optimism
npm run deploy:contracts:arbitrum
npm run deploy:contracts:polygon

# Update all addresses in deployments.abi.ts
npm run contracts:extract-abis
```

### Contract Upgrades

For upgradeable contracts (advanced):

1. Use proxy pattern (ProxyAdmin + Implementation)
2. Deploy new implementation
3. Upgrade proxy to point to new implementation
4. Maintain same address for users

### Custom RPC Endpoints

Edit `thirdweb.json` to use custom RPC:

```json
{
  "chain_configs": {
    "base": {
      "rpc": "https://your-custom-rpc.com/...",
      "chain_id": 8453
    }
  }
}
```

## Summary

**Deployment Workflow:**

```
1. npm install              # Install dependencies
2. cp .env.example .env     # Create environment file
3. Edit .env                # Add PRIVATE_KEY
4. npm run deploy:contracts:testnet  # Deploy to testnet
5. Verify on explorer       # Check contract source
6. npm run contracts:extract-abis    # Generate ABIs
7. Update deployments.abi.ts         # Add addresses
8. npm run deploy:contracts:base     # Deploy to mainnet
9. Update backend contracts # Update src/aura-ai-server.ts
10. Test frontend interactions       # Verify everything works
```

**Quick Commands:**

```bash
npm run deploy:contracts              # Interactive deployment
npm run deploy:contracts:testnet      # Deploy to Arbitrum Sepolia
npm run deploy:contracts:base         # Deploy to Base
npm run contracts:extract-abis        # Generate frontend ABIs
npm run contracts:info                # Show deployment info
```

---

**Last Updated**: November 30, 2025
**Status**: ✅ Ready for Deployment
