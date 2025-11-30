# Aura-AI Quick Reference Guide

## 🚀 Quick Start

### 1. Start the Server
```bash
wrangler dev
```
Server runs on `http://localhost:8787`

### 2. Submit a Query
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","text":"Your question here"}'
```

### 3. Check Your Tokens
```bash
curl http://localhost:8787/api/user/user1/tokens
```

---

## 📋 Common Curl Commands

### Get Health Status
```bash
curl http://localhost:8787/health
```

### Finance Question
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user1",
    "text":"Should I invest in the stock market?"
  }'
```

### Learning Question
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user1",
    "text":"How do I improve my programming skills?"
  }'
```

### Business Question
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user1",
    "text":"What is the best go-to-market strategy?"
  }'
```

### View Transactions
```bash
curl "http://localhost:8787/api/user/user1/transactions?limit=50"
```

---

## 💰 Token System

| Action | Tokens |
|--------|--------|
| Submit Query | +10 |
| Deep Insight | -50 |
| Application Reward | +5-50 |
| Starting Balance | 100 |

---

## 🧠 Insight Categories

| Category | Use Case |
|----------|----------|
| **finance** | Investment, budgeting, wealth |
| **learning** | Skills, education, career |
| **business** | Startups, strategy, growth |
| **trends** | Emerging opportunities, market |
| **personal** | Life decisions, goals |

---

## 📱 Supported Platforms

- ✅ Web API (REST)
- ✅ WhatsApp (webhook)
- ✅ Telegram (webhook)
- ✅ Discord (webhook)
- 🔄 Mobile apps (coming soon)

---

## 📊 Sample Response Structure

```json
{
  "success": true,
  "insightId": "uuid",
  "insight": {
    "recommendation": "Transparent recommendation with reasoning",
    "explanation": {
      "reasoning": "Step-by-step reasoning",
      "dataPoints": ["point1", "point2"],
      "alternatives": ["alt1", "alt2"],
      "riskFactors": ["risk1", "risk2"]
    },
    "actionableSteps": [
      "Step 1",
      "Step 2",
      "Step 3"
    ],
    "tokensRewarded": 10
  }
}
```

---

## 🔧 Endpoint Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/api/query` | Submit query |
| GET | `/api/user/{id}/tokens` | Check tokens |
| GET | `/api/user/{id}/transactions` | View history |
| POST | `/webhooks/whatsapp` | WhatsApp webhook |
| POST | `/webhooks/telegram` | Telegram webhook |
| POST | `/webhooks/discord` | Discord webhook |

---

## 🔑 Key Features

1. **Transparent Reasoning** - See how recommendations are made
2. **Token Economy** - Earn and spend tokens
3. **Full Audit Trail** - Every transaction logged
4. **Multi-Platform** - Access from any channel
5. **Agent Collaboration** - MCP resources for AI agents

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check if port is in use
lsof -i :8787
```

### Can't connect to server
```bash
# Make sure wrangler dev is running
wrangler dev

# Check server is on localhost:8787
curl http://localhost:8787/health
```

### Token balance not updating
- Check that userId matches in queries
- Verify POST request has Content-Type: application/json
- Check KV namespace is bound

---

## 📚 Learn More

- Full docs: See `AURA_AI_DOCS.md`
- MCP Spec: https://spec.modelcontextprotocol.io/
- Cloudflare: https://developers.cloudflare.com/workers/

---

## 🎯 Example Workflow

```bash
# 1. Check health
curl http://localhost:8787/health

# 2. Get insight on learning
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","text":"How to learn Python?"}'

# 3. Check tokens earned
curl http://localhost:8787/api/user/user1/tokens

# 4. See all transactions
curl http://localhost:8787/api/user/user1/transactions

# 5. Get another insight
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","text":"Best investments for 2025?"}'

# 6. Check updated token balance
curl http://localhost:8787/api/user/user1/tokens
```

---

## 🎓 Understanding the Insight

Each insight provides:

1. **Recommendation** - Clear action to take
2. **Reasoning** - Why this recommendation (transparent)
3. **Data Points** - What information was considered
4. **Alternatives** - Other options and why not chosen
5. **Risk Factors** - Potential downsides
6. **Action Steps** - Concrete steps to implement

This transparency is what makes Aura-AI different from black-box AI.

---

**Happy exploring! 🚀**
