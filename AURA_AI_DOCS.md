# Aura-AI: Transparent, MCP-Powered Real-Impact Agent

**Your AI companion for insights, opportunities, and actionable recommendations — anywhere you interact.**

---

## 🎯 Overview

Aura-AI is an autonomous, transparent AI agent that provides actionable insights and guidance to users across social platforms and web dashboards. Every query, response, and token transaction is transparent and logged, enabling agents to collaborate and users to understand exactly how recommendations are made.

### Core Principles

- **🤖 Transparent Reasoning**: Users see exactly how recommendations are made - no black-box AI
- **💰 Token Economy**: Users earn Aura Tokens for engagement and applying insights; tokens unlock deeper recommendations
- **🎯 Actionable Guidance**: Real steps you can take, not just data or predictions
- **🔗 MCP Compliance**: Every interaction stored as MCP objects for agent-to-agent collaboration
- **📊 Multi-Platform**: WhatsApp, Telegram, Discord, and Web UI access

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Users & Platforms               │
│  (WhatsApp, Telegram, Discord, Web)     │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │  Aura-AI Agent  │
        │ (MCP Server)    │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐ ┌──────────┐ ┌─────────┐
│  Token  │ │ Insight  │ │   MCP   │
│ Service │ │ Engine   │ │Resources│
└────┬────┘ └────┬─────┘ └────┬────┘
     │           │            │
     └───────────┼────────────┘
                 │
        ┌────────▼────────────┐
        │   Cloudflare KV     │
        │   (Data Storage)    │
        └─────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- Wrangler 4.32+
- A Cloudflare account

### Installation

```bash
cd aura-ai
npm install
# or
npx wrangler types  # Generate type definitions
```

### Development

```bash
# Start the development server
wrangler dev

# Server will run on http://localhost:8787
```

### Testing the API

```bash
# Health check
curl http://localhost:8787/health

# Submit a query
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "text": "What are good investment strategies for beginners?"
  }'

# Check user tokens
curl http://localhost:8787/api/user/user123/tokens

# View transaction history
curl http://localhost:8787/api/user/user123/transactions
```

---

## 📚 API Documentation

### REST Endpoints

#### **Health Check**
```
GET /health
```

Returns server status and timestamp.

**Response:**
```json
{
  "status": "ok",
  "message": "Aura-AI is running",
  "timestamp": "2025-11-30T01:06:03.469Z"
}
```

#### **Submit Query & Get Insight**
```
POST /api/query
Content-Type: application/json

{
  "userId": "string",
  "text": "string"
}
```

Returns a transparent insight with explanation, action steps, and token reward.

**Response:**
```json
{
  "success": true,
  "insightId": "uuid",
  "insight": {
    "recommendation": "string",
    "explanation": {
      "reasoning": "string",
      "dataPoints": ["string"],
      "alternatives": ["string"],
      "riskFactors": ["string"]
    },
    "actionableSteps": ["string"],
    "tokensRewarded": 10
  }
}
```

#### **Get User Token Balance**
```
GET /api/user/{userId}/tokens
```

Returns current token balance and statistics.

**Response:**
```json
{
  "userId": "string",
  "balance": 110,
  "totalEarned": 110,
  "totalSpent": 0,
  "lastUpdated": "ISO-8601 timestamp"
}
```

#### **View Transaction History**
```
GET /api/user/{userId}/transactions?limit=20
```

Returns recent token transactions.

**Response:**
```json
{
  "userId": "string",
  "count": 1,
  "transactions": [
    {
      "id": "uuid",
      "userId": "string",
      "type": "earn_engagement",
      "amount": 10,
      "description": "string",
      "timestamp": "ISO-8601 timestamp"
    }
  ]
}
```

---

### Social Platform Webhooks

#### **WhatsApp**
```
POST /webhooks/whatsapp

GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```

Handles WhatsApp Business API webhooks.

#### **Telegram**
```
POST /webhooks/telegram
```

Handles Telegram bot webhooks.

#### **Discord**
```
POST /webhooks/discord
```

Handles Discord message webhooks.

---

### MCP Tools

Aura-AI exposes the following tools via the Model Context Protocol:

#### **process_query**
Submit a question and receive a transparent insight with full reasoning.

**Parameters:**
- `userId` (string): User identifier
- `queryText` (string): The question or situation
- `category` (enum): Optional - 'finance' | 'learning' | 'business' | 'trends' | 'personal'
- `platform` (enum): Origin platform - 'whatsapp' | 'telegram' | 'discord' | 'web'

#### **get_user_tokens**
Retrieve a user's current token balance and statistics.

**Parameters:**
- `userId` (string): User identifier

#### **spend_tokens**
Spend tokens to unlock deeper analysis of an insight.

**Parameters:**
- `userId` (string): User identifier
- `insightId` (string): ID of the insight to deepen
- `tokenAmount` (number): Tokens to spend

#### **get_transaction_history**
View a user's token transaction history.

**Parameters:**
- `userId` (string): User identifier
- `limit` (number): Max transactions to retrieve (default: 20)

#### **award_tokens** (Admin)
Award tokens to a user for incentives or corrections.

**Parameters:**
- `userId` (string): User to reward
- `amount` (number): Tokens to award
- `reason` (string): Reason for award

---

### MCP Resources

Access Aura-AI data for agent-to-agent collaboration:

#### **Queries**
```
aura://queries/{userId}/{queryId}
```

Access user questions for transparency and collaboration.

#### **Insights**
```
aura://insights/{insightId}
```

Full insight data with reasoning, data points, and recommendations.

#### **Transactions**
```
aura://transactions/{userId}/{transactionId}
```

Token transaction audit trail for economic transparency.

#### **User Profiles**
```
aura://profiles/{userId}
```

User context including tokens, preferences, and history.

#### **Insight Catalog**
```
aura://catalog/insights?type={type}&limit={limit}
```

Browse insights across the network for pattern discovery.

---

### MCP Prompts

Aura-AI provides guided prompts:

- **introduction** - Welcome and system overview
- **finance_guide** - Financial decision guidance
- **learning_guide** - Learning strategy recommendations
- **business_guide** - Business and entrepreneurship guidance
- **trends_guide** - Emerging trends and opportunities analysis

---

## 💰 Token Economy

### Earning Tokens

- **Query Engagement**: +10 tokens per question submitted
- **Application**: +5-50 tokens for applying insights (manual award)
- **Community Contributions**: Additional tokens for sharing insights

### Spending Tokens

- **Deep Insight**: 50 tokens to unlock advanced analysis
- **Premium Features**: Variable costs for specialized analysis

### Token Mechanics

1. Users start with 100 tokens
2. All transactions are recorded and audited
3. Token balance visible in real-time
4. Transaction history fully transparent

---

## 🧠 Insight Engine

### Insight Categories

#### **Finance**
- Investment strategies
- Risk management
- Portfolio construction
- Debt and savings management

#### **Learning**
- Skill development paths
- Learning science applications
- Course and program evaluation
- Career development

#### **Business**
- Startup validation
- Market analysis
- Unit economics
- Growth strategies

#### **Trends**
- Emerging opportunities
- Technology disruption
- Market adoption curves
- Risk assessment

#### **Personal**
- Decision-making frameworks
- Goal setting
- Habit formation
- Life strategies

### Insight Structure

Every insight includes:

1. **Recommendation** - Clear, actionable main guidance
2. **Reasoning** - Transparent explanation of how recommendation was derived
3. **Data Points** - Information considered in analysis
4. **Alternatives** - Other approaches considered and why they weren't chosen
5. **Risk Factors** - Potential pitfalls and downside risks
6. **Action Steps** - Concrete, implementable steps to execute

---

## 📱 Social Platform Integration

### WhatsApp
- Real-time insight delivery via WhatsApp Business API
- Question → Insight in one message thread
- Token rewards credited immediately

### Telegram
- Bot integration for instant insights
- Inline buttons for deeper analysis
- Full insight transparency in messages

### Discord
- Server integration with command parsing
- Rich embeds with formatted insights
- Community-driven insight sharing

### Web Dashboard
- Full UI for inquiry submission
- Real-time token tracking
- Transaction history view
- Insight library access

---

## 🔐 Transparency & Trust

### How Aura-AI Differs from Black-Box AI

1. **Visible Reasoning** - Users see exactly why recommendations are made
2. **Data Point Disclosure** - Information sources and considerations listed
3. **Alternative Analysis** - Other perspectives explicitly evaluated
4. **Risk Acknowledgment** - Downsides and limitations clearly stated
5. **Audit Trail** - Every transaction logged and accessible

### MCP Compliance

All data stored as MCP objects:
- Queries tracked and searchable
- Insights reproducible and verifiable
- Transactions immutable and auditable
- Resources accessible to other agents

---

## 🛠️ Development

### Project Structure

```
src/
├── aura-ai-server.ts       # Main MCP server with Hono routes
├── token-service.ts         # Token economy implementation
├── insight-engine.ts        # Insight generation logic
├── social-adapters.ts       # Platform integrations (WhatsApp, Telegram, Discord)
├── tools.ts                 # MCP tools
├── resources.ts             # MCP resources
├── prompts.ts               # MCP prompts
├── types.ts                 # TypeScript type definitions
├── index.ts                 # Worker entry point
└── env.d.ts                 # Environment type definitions

test/
├── client.test.ts           # Integration tests

wrangler.jsonc              # Cloudflare Worker configuration
tsconfig.json               # TypeScript configuration
package.json                # Dependencies
```

### Adding New Insight Categories

1. Add enum to `InsightType` in `types.ts`
2. Implement category logic in `InsightEngine` class
3. Add relevant data points and risk factors
4. Create new prompt in `prompts.ts`

### Adding New Social Platforms

1. Create new adapter class in `social-adapters.ts`
2. Implement `parseMessage()` and `sendMessage()`
3. Add webhook route in `aura-ai-server.ts`
4. Register in `PlatformRouter`

---

## 📦 Deployment

### Deploy to Cloudflare Workers

```bash
# Build and dry-run
npm run build

# Deploy to production
npm run deploy
```

### Environment Variables

Configure in your Cloudflare Worker dashboard:
- `GPT_API_KEY` - API key for LLM integration (when available)
- KV namespace bindings for data storage

---

## 🧪 Testing

```bash
# Run test suite
npm test

# Type checking
npx tsc --noEmit

# Build check
npm run build
```

---

## 📈 Metrics & Monitoring

Aura-AI tracks:
- Total users and active sessions
- Queries submitted and insights generated
- Token distribution and economics
- Platform-specific engagement
- Insight quality and user satisfaction

---

## 🚦 Roadmap

### Phase 1 ✅ (Complete)
- Core token economy system
- Insight engine with transparent reasoning
- MCP tools and resources
- Social platform adapters
- REST API endpoints

### Phase 2 (In Progress)
- Web dashboard UI
- Advanced insight analytics
- User profile and preferences
- Integration testing

### Phase 3 (Planned)
- LLM integration for dynamic insights
- Machine learning for personalization
- Mobile applications (iOS/Android)
- Advanced fraud detection
- Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Areas for contribution:

1. **Platform Integrations** - Add more social platforms
2. **Insight Categories** - Expand insight types and domains
3. **Testing** - More comprehensive test coverage
4. **Documentation** - Improve guides and examples
5. **Performance** - Optimize token and insight systems

---

## 📄 License

MIT - See LICENSE file

---

## 🎓 Resources

### Documentation
- [Model Context Protocol (MCP)](https://spec.modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)

### API Integration Guides
- WhatsApp Business API
- Telegram Bot API
- Discord API

---

## 📞 Support

For issues, questions, or feature requests:
1. Check the [GitHub Issues](https://github.com/your-org/aura-ai/issues)
2. Review this documentation
3. Reach out to the community

---

## 🌟 Key Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Token Economy | ✅ | Earn/spend tokens, full audit trail |
| Insight Engine | ✅ | 5 categories, transparent reasoning |
| MCP Tools | ✅ | 5+ tools for query and token management |
| MCP Resources | ✅ | 5+ resources for agent collaboration |
| WhatsApp Integration | ✅ | Webhook-based message processing |
| Telegram Integration | ✅ | Bot API integration |
| Discord Integration | ✅ | Webhook support |
| Web API | ✅ | REST endpoints for queries and tokens |
| Web Dashboard | 🔄 | In development |
| LLM Integration | 📋 | Planned |

---

**Built with ❤️ using Model Context Protocol and Cloudflare Workers**
