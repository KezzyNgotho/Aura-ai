import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function setupServerPrompts(server: McpServer) {
  /**
   * Introduction Prompt - Welcome users and explain the system
   */
  server.prompt(
    'introduction',
    'Learn about Aura-AI and how to get started',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `Welcome to **Aura-AI** ✨

Your transparent AI companion for insights, opportunities, and actionable recommendations.

## What is Aura-AI?

Aura-AI is an autonomous agent that provides:
- **Transparent Insights**: See exactly how I arrive at recommendations
- **Actionable Guidance**: Real steps you can take, not just data
- **Multi-Platform Access**: Connect via WhatsApp, Telegram, Discord, or Web
- **Token Economy**: Earn Aura Tokens for engagement, spend them for deeper insights
- **Full Transparency**: Every query, response, and token movement is logged

## How It Works

1. **Ask a Question** - Submit any question about finance, learning, business, trends, or personal decisions
2. **Receive Insight** - Get a transparent recommendation with clear reasoning
3. **Earn Tokens** - Gain Aura Tokens just for engaging
4. **Deepen Knowledge** - Spend tokens to unlock deeper analysis
5. **See the Reasoning** - Always understand why recommendations are made

## Key Features

- 🤖 **Transparent Reasoning**: Full explanations, no black-box AI
- 💰 **Token Economy**: Earn tokens for insights, spend for premium analysis
- 🎯 **Actionable Steps**: Clear, implementable recommendations
- 🔗 **Agent Collaboration**: Other AI agents can verify and build on your insights
- 📊 **Full Audit Trail**: Complete transparency of all transactions

## Getting Started

- **Process Query**: Ask your first question with \`process_query\`
- **Check Balance**: View your tokens with \`get_user_tokens\`
- **See History**: Review transactions with \`get_transaction_history\`
- **Go Deeper**: Unlock deep insights with \`spend_tokens\`

What would you like insights on today?`
        }
      }]
    })
  );

  /**
   * Finance Guidance Prompt
   */
  server.prompt(
    'finance_guide',
    'Get guidance on financial decisions and Aura-AI\'s approach to finance',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Finance Insights with Aura-AI

Aura-AI provides transparent financial guidance across:

### Investment Decisions
- **Equity Analysis**: Stock picking considerations
- **Diversification**: Portfolio construction principles
- **Risk Management**: Downside protection strategies
- **Time Horizon**: Short-term vs long-term approaches

### Personal Finance
- **Budgeting**: Expense tracking and optimization
- **Debt Management**: Payoff strategies and refinancing
- **Savings Goals**: Emergency funds to retirement
- **Tax Efficiency**: Legal optimization strategies

### Business Finance
- **Startup Funding**: Capital raising options
- **Unit Economics**: Revenue and cost analysis
- **Cash Flow**: Managing business liquidity
- **Growth Metrics**: Key financial indicators

### Our Approach
✓ Evidence-based analysis
✓ Risk disclosure
✓ Alternative perspectives
✓ Action-oriented recommendations

## Example Financial Questions

- "How should I allocate between stocks and bonds?"
- "What's a good startup burn rate?"
- "How much emergency fund do I need?"
- "Should I pay off my mortgage early?"

Ask your financial question to receive a transparent, actionable insight!`
        }
      }]
    })
  );

  /**
   * Learning Strategy Prompt
   */
  server.prompt(
    'learning_guide',
    'Guidance on effective learning and skill development',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Learning Insights with Aura-AI

Aura-AI provides transparent guidance on learning and skill development:

### Effective Learning
- **Spaced Repetition**: Retention science principles
- **Active Recall**: Self-testing strategies
- **Deliberate Practice**: Focused skill improvement
- **Learning Communities**: Peer and mentor support

### Skill Development
- **Prerequisites**: Foundation skills needed
- **Learning Path**: Recommended sequence
- **Time Commitment**: Realistic expectations
- **Practice Projects**: Real-world application

### Career Development
- **High-Value Skills**: Market-relevant abilities
- **Skill Stacking**: Combining complementary skills
- **Continuous Learning**: Staying current
- **Credential Value**: Certifications and degrees

### Our Framework
✓ Learning science research
✓ Multiple learning styles
✓ Clear progress milestones
✓ Community connections

## Example Learning Questions

- "How do I learn machine learning effectively?"
- "What skills should a product manager develop?"
- "Is a bootcamp worth the investment?"
- "How can I improve my writing?"

Ask your learning question to get a transparent roadmap!`
        }
      }]
    })
  );

  /**
   * Business Strategy Prompt
   */
  server.prompt(
    'business_guide',
    'Strategic guidance for business decisions and entrepreneurship',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Business Insights with Aura-AI

Aura-AI provides transparent business strategy guidance:

### Startup & Growth
- **Validation**: Customer and market validation
- **MVP Development**: Minimum viable product strategy
- **Go-to-Market**: Launch and growth strategies
- **Scaling**: Systems and team building

### Market Analysis
- **Opportunity Identification**: Market gaps
- **Competitive Landscape**: Competitor analysis
- **Market Sizing**: TAM, SAM, SOM
- **Timing**: When to enter and scale

### Business Model
- **Revenue Models**: Subscription vs one-time
- **Unit Economics**: CAC, LTV, payback period
- **Positioning**: Market differentiation
- **Partnerships**: Strategic alliances

### Our Approach
✓ Evidence-based frameworks
✓ Real-world examples
✓ Risk identification
✓ Execution roadmap

## Example Business Questions

- "How do I validate my startup idea?"
- "What's a good unit economics target?"
- "Should I target B2B or B2C?"
- "How do I acquire customers cheaply?"

Get transparent business strategy insights!`
        }
      }]
    })
  );

  /**
   * Trends & Opportunities Prompt
   */
  server.prompt(
    'trends_guide',
    'Insights on emerging trends and opportunities',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## Trends & Opportunities with Aura-AI

Aura-AI analyzes emerging trends and identifies opportunities:

### Trend Analysis
- **Adoption Curves**: S-curve stage identification
- **Early Signals**: Pattern recognition
- **Hype Cycles**: Distinguishing signal from noise
- **Timing**: Entry and exit windows

### Opportunity Identification
- **Blue Oceans**: Uncontested markets
- **Emerging Sectors**: Growing industries
- **Technology Disruption**: Innovation impacts
- **Consumer Behavior Shifts**: Emerging preferences

### Risk Assessment
- **Regulatory Changes**: Policy impacts
- **Technology Obsolescence**: Disruption risks
- **Market Saturation**: Competition dynamics
- **Black Swan Events**: Low-probability risks

### Our Approach
✓ Data-driven analysis
✓ Historical patterns
✓ Expert synthesis
✓ Scenario planning

## Example Trend Questions

- "Is AI the next bubble or transformative?"
- "What's the next big opportunity in climate tech?"
- "Are NFTs still relevant?"
- "Which emerging markets will grow fastest?"

Ask about trends you're interested in!`
        }
      }]
    })
  );
}
