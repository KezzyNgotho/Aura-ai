# 🚀 Quick Deployment Guide - Get Secret Key & Deploy

## Step 1: Get Your ThirdWeb Secret Key (2 minutes)

1. **Open Dashboard**: https://thirdweb.com/team/~/~/
2. **Find API Keys**: Look for "API Keys" or "Settings" section in left sidebar
3. **Create New Key**: Click "Create API Key" or "Generate Key"
4. **Copy Your Key**: Copy the generated secret key
5. **Save It**: Add to your `.env` file

**Example .env:**
```
THIRDWEB_SECRET_KEY=your_copied_key_here
PRIVATE_KEY=0xc7025ec1c4376a0306d8745cea628bd1e973f4ebfe26ed131ebcf6d1c4f9d842ac68f
```

## Step 2: Get Test ETH (5 minutes)

You need gas funds to deploy. For testnet:

1. **Get Wallet Address**: Get the public address from your private key
2. **Arbitrum Faucet**: https://faucet.arbitrum.io/
3. **Request ETH**: Paste your address and request test ETH
4. **Wait**: Usually takes 1-2 minutes

## Step 3: Deploy Contracts (5 minutes)

Once you have the secret key and test ETH:

```bash
# Simple one-command deploy
npm run deploy:contracts

# The CLI will:
# 1. Ask which contracts to deploy
# 2. Ask which network (select Arbitrum Sepolia)
# 3. Show gas estimates
# 4. Deploy when you confirm
# 5. Show you the contract addresses
```

## That's It!

After deployment, you'll get contract addresses like:
```
✓ AuraToken deployed to: 0x1234...5678
✓ RewardsMinter deployed to: 0xabcd...ef00
✓ TokenConverter deployed to: 0x9999...0000
✓ AgentMarketplace deployed to: 0x8888...1111
```

Save these addresses in your `.env`:
```
AURA_TOKEN_ADDRESS=0x1234...5678
REWARDS_MINTER_ADDRESS=0xabcd...ef00
TOKEN_CONVERTER_ADDRESS=0x9999...0000
AGENT_MARKETPLACE_ADDRESS=0x8888...1111
```

## Troubleshooting

### "Device Authorization Required"
- You're seeing this because ThirdWeb needs to authenticate your CLI
- The solution: Use the secret key with `-k` flag
- Our commands already include this!

### "Invalid Secret Key"
- Make sure you copied the entire key
- No spaces before/after
- Example format: `THIRDWEB_SECRET_KEY=abc123...xyz`

### "Insufficient Funds"
- Get more test ETH from faucet
- Or deploy to a cheaper network later (Base is cheapest)

### "Contract Already Deployed"
- Use a different wallet address
- Or deploy to a different network

## Need Help?

1. **ThirdWeb Docs**: https://docs.thirdweb.com/
2. **ThirdWeb Discord**: https://discord.gg/thirdweb
3. **Check your .env**: Make sure both keys are present

---

**Total Time**: ~15 minutes from start to deployed contracts ⚡
