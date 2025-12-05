import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Response template format for all prompts
const createAuraResponse = (approach: string[], whyItWorks: string, tokens: number = 10) => `
${approach.map((step, i) => `(${i + 1}) **${step.split(':')[0]}**: ${step.split(':')[1]}`).join('\n')}

**Why This Works**: ${whyItWorks}

📥 Download
📤 Share
+${tokens} AURA
`;

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

## How to Approach Aura-AI

(1) **Understand the Purpose**: Aura-AI provides transparent, actionable insights on finance, learning, business, and trends. Not predictions - frameworks and reasoning.

(2) **Ask Real Questions**: Submit genuine questions about decisions you're facing. "How should I price my service?" works better than generic questions.

(3) **Use the Framework**: Each response follows a 4-step approach: Learn → Practice → Find Your Angle → Build Community.

(4) **Earn While Learning**: Every interaction earns you AURA tokens. Spend them to unlock deeper analysis or save for premium features.

**Why This Works**: You get transparent reasoning instead of black-box predictions. You understand the "why" behind every recommendation. You build real skills, not just consume content.

## Key Features

- 🤖 **Transparent Reasoning**: See the 4-step framework for every topic
- 💰 **Token Economy**: Earn AURA for engagement, spend for depth
- 🎯 **Actionable Steps**: Concrete next steps, not theory
- 🔗 **Peer Learning**: Connect with others tackling similar questions
- 📊 **Full Audit Trail**: All transactions logged on-chain

**What would you like insights on today?**

📥 Download
📤 Share
+10 AURA`
        }
      }]
    })
  );

  /**
   * Finance Guidance Prompt
   */
  server.prompt(
    'finance_guide',
    'Get guidance on financial decisions with the "How to Approach" framework',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## How to Approach Financial Decisions

(1) **Learn the Fundamentals**: Find 2-3 credible sources (books, courses, experts like Bogleheads). Spend 1-2 weeks understanding core concepts (compound interest, diversification, risk-return tradeoff).

(2) **Know Your Situation**: Assess your cash flow, risk tolerance, time horizon, and specific goals (retirement, home, children). This context matters more than any portfolio template.

(3) **Test Your Strategy**: Start small with real money. Paper trading doesn't teach the emotional discipline that real stakes do. Begin with a simple portfolio, then adjust.

(4) **Build Your Advisory Network**: Connect with mentors, financial advisors (fee-only, not commission-based), and communities. Your financial decisions improve with diverse perspectives.

**Why This Works**: Financial success isn't about picking the "right" stock - it's about consistent execution of a sound strategy. The best investors have deep conviction in their approach because they understand it inside-out.

## Example Financial Questions

- "How should I allocate between stocks and bonds?"
- "What's a realistic startup burn rate?"
- "How much emergency fund do I actually need?"
- "Should I pay off my mortgage early?"

Ask your financial question to get a transparent, actionable framework!

📥 Download
📤 Share
+10 AURA`
        }
      }]
    })
  );

  /**
   * Learning Strategy Prompt
   */
  server.prompt(
    'learning_guide',
    'Guidance on effective learning with the "How to Approach" framework',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## How to Approach Learning Any Skill

(1) **Learn the Basics**: Find 2-3 credible sources (books, courses, experts). Spend 1-2 weeks getting foundational knowledge. Don't skip fundamentals - they're the foundation for everything else.

(2) **Get Hands-On**: Apply what you learn through small projects or experiments. This is where real understanding happens. Theory without practice becomes forgotten.

(3) **Find Your Angle**: Discover what aspect interests you most - this drives long-term engagement. Machine learning enthusiast? Focus on computer vision. That specificity matters.

(4) **Build Community**: Connect with others learning or working in this space - shared knowledge accelerates growth. Reddit, Discord, local meetups all work.

**Why This Works**: Any skill, business, or topic follows the same learning arc: awareness → understanding → practice → mastery. The timeline varies, but the process is universal. Most people quit at step 2 - don't.

## Example Learning Questions

- "How do I learn machine learning effectively?"
- "What skills should a product manager actually develop?"
- "Is a bootcamp worth the investment?"
- "How can I improve my writing?"

Ask your learning question to get a transparent roadmap!

📥 Download
📤 Share
+10 AURA`
        }
      }]
    })
  );

  /**
   * Business Strategy Prompt
   */
  server.prompt(
    'business_guide',
    'Strategic guidance for business decisions using the "How to Approach" framework',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## How to Approach Business Strategy

(1) **Learn the Frameworks**: Understand core concepts (TAM/SAM/SOM, unit economics, go-to-market). Read 2-3 business strategy books (Lean Startup, Good Strategy Bad Strategy). Spend 1-2 weeks on fundamentals.

(2) **Validate with Your Market**: Don't just plan - talk to 20+ potential customers. Validation beats assumptions. What do they actually want vs what you think they want?

(3) **Start with MVP Focus**: Build the minimum product that solves one core problem. Get it in hands. Real feedback beats perfect planning.

(4) **Find Your Competitive Edge**: What can you do that competitors can't? Is it speed? Trust? Niche focus? Double down on this, not on features everyone else has.

**Why This Works**: Most businesses fail because of poor customer fit, not poor execution. The teams that win understand their market deeply and move with conviction. Perfect strategy + no market = failure. Good strategy + strong market = success.

## Example Business Questions

- "How do I validate my startup idea?"
- "What's a good unit economics target?"
- "Should I target B2B or B2C?"
- "How do I acquire customers cheaply?"

Get transparent business strategy frameworks!

📥 Download
📤 Share
+10 AURA`
        }
      }]
    })
  );

  /**
   * Trends & Opportunities Prompt
   */
  server.prompt(
    'trends_guide',
    'Insights on emerging trends and opportunities using the "How to Approach" framework',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `## How to Approach Identifying Trends & Opportunities

(1) **Learn Signal from Noise**: Study historical adoption curves (smartphones, cloud, AI). Understanding the S-curve helps you identify where we are in emerging trends. Early, mid, or late stage?

(2) **Monitor Leading Indicators**: Track where top companies are investing, what early adopters are doing, patent filings, regulatory changes. These signal where the market is heading.

(3) **Build Your Thesis**: Form a specific opinion: "AI will be huge in X domain" with reasons why. Test it against counter-arguments. If you can't articulate why, you don't understand it.

(4) **Find Your Unique Position**: Ask: "What can I do that others can't?" Maybe you have domain expertise, unique connections, or a different perspective. That's your edge in a trend.

**Why This Works**: Most people chase trends after they're mainstream. The money goes to early movers. But early moving requires conviction + understanding. Lucky investors are still just lucky.

## Example Trend Questions

- "Is AI the next bubble or transformative?"
- "What's the next big opportunity in climate tech?"
- "Are Web3 apps still relevant?"
- "Which emerging markets will grow fastest?"

Ask about trends you're interested in!

📥 Download
📤 Share
+10 AURA`
        }
      }]
    })
  );
}
