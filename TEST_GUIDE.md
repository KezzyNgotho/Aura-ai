# Aura-AI Testing Guide

## 🚀 Getting Started

### Start the Development Server

```bash
cd /home/kezz/Desktop/NULLSHOT/aura-ai
wrangler dev
```

The server will run on `http://localhost:8787`

---

## ✅ Health Check

Verify the server is running:

```bash
curl http://localhost:8787/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Aura-AI is running",
  "timestamp": "2025-11-30T01:06:03.469Z"
}
```

---

## 🧪 API Testing

### 1. Finance Query

Submit a financial question and get a transparent insight:

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "text": "What are good investment strategies for beginners?"
  }' | jq .
```

**Expected Response:**
- `success`: true
- `insightId`: UUID
- `insight.recommendation`: Detailed recommendation
- `insight.explanation.dataPoints`: 5+ financial metrics
- `insight.explanation.alternatives`: 4 investment approaches
- `insight.explanation.riskFactors`: 5 financial risks
- `insight.actionableSteps`: 5 concrete steps
- `insight.tokensRewarded`: 10

### 2. Learning Query

Get guidance on skill development:

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "text": "How can I learn machine learning effectively?"
  }' | jq .
```

**Verify:**
- Response contains learning-specific data points
- Actionable steps relate to learning strategy
- Tokens awarded (+10)

### 3. Business Query

Submit a business/startup question:

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "text": "What are key metrics for a SaaS startup?"
  }' | jq .
```

**Verify:**
- Recommendation is business-specific
- Risk factors include startup-specific risks
- Steps are actionable for entrepreneurs

### 4. Trends Query

Get insights on emerging opportunities:

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "text": "What emerging technologies should I watch in 2025?"
  }' | jq .
```

**Verify:**
- Data points include adoption curves and market data
- Alternatives discuss different technology approaches
- Risk factors mention disruption and timing risks

### 5. Personal Decision Query

Get life guidance:

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser1",
    "text": "Should I change careers or keep developing my current skills?"
  }' | jq .
```

**Verify:**
- Recommendation is non-prescriptive and balanced
- Data points consider personal factors
- Actionable steps are implementable

---

## �� Token System Testing

### Check Token Balance

```bash
curl http://localhost:8787/api/user/testuser1/tokens | jq .
```

**Expected Response:**
```json
{
  "userId": "testuser1",
  "balance": 100,
  "totalEarned": 100,
  "totalSpent": 0,
  "lastUpdated": "2025-11-30T..."
}
```

**After submitting 2 queries:**
```bash
curl http://localhost:8787/api/user/testuser1/tokens | jq .
```

**Expected Result:**
```json
{
  "userId": "testuser1",
  "balance": 120,
  "totalEarned": 120,
  "totalSpent": 0,
  "lastUpdated": "2025-11-30T..."
}
```

### View Transaction History

```bash
curl http://localhost:8787/api/user/testuser1/transactions | jq .
```

**Expected Response:**
```json
{
  "userId": "testuser1",
  "count": 2,
  "transactions": [
    {
      "id": "uuid",
      "userId": "testuser1",
      "type": "earn_engagement",
      "amount": 10,
      "description": "Web query: How can I learn...",
      "timestamp": "2025-11-30T..."
    },
    {
      "id": "uuid",
      "userId": "testuser1",
      "type": "earn_engagement",
      "amount": 10,
      "description": "Web query: What are good...",
      "timestamp": "2025-11-30T..."
    }
  ]
}
```

**Test Verification:**
- Each query adds exactly +10 tokens
- Transaction count increases
- Descriptions match the queries
- Timestamps are valid ISO format

### View Limited Transactions

```bash
curl "http://localhost:8787/api/user/testuser1/transactions?limit=5" | jq .
```

---

## 🧬 Insight Engine Testing

### Test Different Categories

Test that the insight engine correctly categorizes queries:

#### Finance (Auto-detected)
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test2","text":"How should I allocate my investment portfolio?"}'
```
**Verify:** Response contains financial data points and risk factors

#### Learning (Auto-detected)
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test2","text":"How do I master a new programming language?"}'
```
**Verify:** Response contains learning science principles

#### Business (Auto-detected)
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test2","text":"How should I validate a startup idea?"}'
```
**Verify:** Response contains business-specific guidance

#### Trends (Auto-detected)
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test2","text":"What are trending in AI right now?"}'
```
**Verify:** Response discusses adoption curves and market timing

#### Personal (Default/Other)
```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test2","text":"How should I approach life decisions?"}'
```
**Verify:** Response uses personal development frameworks

---

## 📊 Multi-User Testing

Test the system with multiple users to verify isolation:

### User 1 Operations
```bash
# User 1 submits query
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_a","text":"Test question 1"}'

# Check User 1 balance
curl http://localhost:8787/api/user/user_a/tokens | jq '.balance'
```

### User 2 Operations
```bash
# User 2 submits query
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_b","text":"Test question 2"}'

# Check User 2 balance
curl http://localhost:8787/api/user/user_b/tokens | jq '.balance'
```

### Verify Isolation
```bash
# User 1 should have their own balance
curl http://localhost:8787/api/user/user_a/tokens | jq '.balance'
# User 2 should have different balance
curl http://localhost:8787/api/user/user_b/tokens | jq '.balance'
```

**Expected:** Each user has independent token balances

---

## 🔄 Comprehensive Test Suite

Run all tests in sequence:

```bash
#!/bin/bash

echo "=== Aura-AI Comprehensive Test Suite ==="
echo ""

# Test 1: Health
echo "1. Testing health endpoint..."
curl -s http://localhost:8787/health | jq . || echo "FAILED"
echo ""

# Test 2: Query - Finance
echo "2. Testing finance insight..."
FINANCE=$(curl -s -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"comprehensive_test","text":"Best investment strategy?"}')
echo $FINANCE | jq '.insight.recommendation' || echo "FAILED"
echo ""

# Test 3: Query - Learning
echo "3. Testing learning insight..."
LEARNING=$(curl -s -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"comprehensive_test","text":"How to learn Python?"}')
echo $LEARNING | jq '.insight.recommendation' || echo "FAILED"
echo ""

# Test 4: Tokens After 2 Queries
echo "4. Checking token balance (should be 120)..."
curl -s http://localhost:8787/api/user/comprehensive_test/tokens | jq '.balance'
echo ""

# Test 5: Transaction History
echo "5. Checking transaction history (should be 2 transactions)..."
curl -s http://localhost:8787/api/user/comprehensive_test/transactions | jq '.count'
echo ""

# Test 6: Business Query
echo "6. Testing business insight..."
BUSINESS=$(curl -s -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"comprehensive_test","text":"SaaS startup metrics?"}')
echo $BUSINESS | jq '.insight.recommendation' | head -c 100
echo "..."
echo ""

# Test 7: Final Balance
echo "7. Final balance (should be 130)..."
curl -s http://localhost:8787/api/user/comprehensive_test/tokens | jq '.balance'
echo ""

echo "=== Test Suite Complete ==="
```

Save as `run_tests.sh` and execute:

```bash
chmod +x run_tests.sh
./run_tests.sh
```

---

## 🐛 Debugging

### Check Server Logs

```bash
# In the wrangler dev terminal, check for errors
# Look for [wrangler:info] messages
```

### Test Connectivity

```bash
# Check if server is responding
curl -i http://localhost:8787/health

# Check response headers
curl -D - http://localhost:8787/health

# Test with verbose output
curl -v http://localhost:8787/health
```

### Pretty-Print JSON

All examples use `jq` for pretty printing. Install if needed:

```bash
sudo apt install jq  # Linux
brew install jq      # macOS
```

---

## ✨ Expected Test Results

### ✅ All Tests Pass When:

1. **Health Check** - Returns 200 with status "ok"
2. **Query Insights** - All return complete insights with:
   - Recommendation
   - Explanation with data points, alternatives, risk factors
   - Actionable steps
   - Token reward (+10)
3. **Token System** - Correctly tracks:
   - Initial 100 tokens
   - +10 per query
   - Cumulative balance
   - Full transaction history
4. **Multi-User** - Each user has:
   - Independent balances
   - Separate transaction histories
5. **Categorization** - Insights match query category:
   - Finance insights for money questions
   - Learning insights for skill questions
   - Business insights for startup questions
   - Trends insights for market questions
   - Personal insights for life questions

---

## 📋 Test Checklist

- [ ] Health endpoint responds
- [ ] Finance query returns full insight
- [ ] Learning query returns full insight
- [ ] Business query returns full insight
- [ ] Trends query returns full insight
- [ ] Personal query returns full insight
- [ ] Initial balance is 100 tokens
- [ ] First query adds 10 tokens (balance 110)
- [ ] Second query adds 10 tokens (balance 120)
- [ ] Transaction history shows 2 transactions
- [ ] Multi-user isolation works (User A ≠ User B)
- [ ] Token descriptions match queries
- [ ] All responses are valid JSON
- [ ] No TypeScript errors on startup
- [ ] Response times < 300ms

---

## 🎓 Learning Resources

- **MCP Spec:** https://spec.modelcontextprotocol.io/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Hono Framework:** https://hono.dev/

---

**Happy Testing! 🚀**
