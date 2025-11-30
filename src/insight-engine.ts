/**
 * Insight Engine
 * Generates transparent, actionable insights with explanations
 */

import { Insight, InsightExplanation, InsightType, Query } from './types';

export interface InsightEngineService {
  generateInsight(query: Query, userId: string): Promise<Insight>;
  generateDeepInsight(insightId: string): Promise<Insight>;
}

export class InsightEngine implements InsightEngineService {
  constructor(private kv: KVNamespace) {}

  async generateInsight(query: Query, userId: string): Promise<Insight> {
    // Determine insight type from query
    const insightType = this._categorizeQuery(query.text) || query.category || InsightType.PERSONAL;
    
    // Generate recommendation and explanation
    const { recommendation, explanation } = await this._generateTransparentRecommendation(
      query.text,
      insightType
    );

    const insight: Insight = {
      id: crypto.randomUUID(),
      queryId: query.id,
      userId,
      type: insightType,
      recommendation,
      explanation,
      actionableSteps: this._extractActionableSteps(recommendation, insightType),
      tokensRewarded: 10, // Base reward for engaging with insight
      timestamp: new Date().toISOString(),
      deepInsightAvailable: true,
      deepInsightTokenCost: 50 // Cost to unlock deeper analysis
    };

    // Save insight to KV
    await this.kv.put(`insight:${insight.id}`, JSON.stringify(insight));

    return insight;
  }

  async generateDeepInsight(insightId: string): Promise<Insight> {
    const existing = await this.kv.get(`insight:${insightId}`, 'json');
    
    if (!existing) {
      throw new Error(`Insight ${insightId} not found`);
    }

    const insight = existing as Insight;

    // Enhance recommendation with deeper analysis
    const deeperAnalysis = await this._generateDeepAnalysis(insight);
    
    insight.recommendation = `${insight.recommendation}\n\n**DEEPER ANALYSIS:**\n${deeperAnalysis}`;
    insight.deepInsightAvailable = false; // Already provided
    
    // Update in KV
    await this.kv.put(`insight:${insightId}`, JSON.stringify(insight));

    return insight;
  }

  private _categorizeQuery(queryText: string): InsightType | null {
    const text = queryText.toLowerCase();

    // Check in priority order
    if (text.match(/finance|money|invest|stock|crypto|blockchain|web3|defi|budget|debt|loan|saving|trading|price|cost|expensive/i)) {
      return InsightType.FINANCE;
    }
    if (text.match(/business|startup|market|customer|revenue|growth|scale|competition|entrepreneur|launch|company/i)) {
      return InsightType.BUSINESS;
    }
    if (text.match(/learn|skill|course|education|book|read|master|improve|study|understand|want to|how to|teach|training|tutorial|guide/i)) {
      return InsightType.LEARNING;
    }
    if (text.match(/trend|news|happening|viral|popular|emerging|future|upcoming|hype|wave|movement/i)) {
      return InsightType.TRENDS;
    }

    // Default to PERSONAL for everything else - it's most flexible
    return InsightType.PERSONAL;
  }

  private async _generateTransparentRecommendation(
    queryText: string,
    type: InsightType
  ): Promise<{ recommendation: string; explanation: InsightExplanation }> {
    // Generate context-specific recommendations based on query and type
    
    // Extract key terms from query for more contextual responses
    const queryLower = queryText.toLowerCase();
    const hasTimeConstraint = /how long|weeks|months|years|timeline|urgent|asap/i.test(queryText);
    const hasRiskConcern = /risk|safe|secure|guaranteed|certain|loss|fail/i.test(queryText);
    const hasResourceConstraint = /budget|cheap|free|expensive|costly|afford/i.test(queryText);

    // Build context-aware reasoning
    const contextFactors = [];
    if (hasTimeConstraint) contextFactors.push('Your stated time constraints and urgency level');
    if (hasRiskConcern) contextFactors.push('Risk tolerance and downside protection preferences');
    if (hasResourceConstraint) contextFactors.push('Available resources and budget constraints');
    if (contextFactors.length === 0) contextFactors.push('Your specific situation and goals');

    const reasoning = `Based on your query: "${queryText}"

I analyzed the following factors for ${type} decisions:
${contextFactors.map((f, i) => `${i + 1}. **${f}**`).join('\n')}
4. **Industry best practices and patterns** for ${type}
5. **Trade-offs and implementation considerations**

My reasoning follows a transparent framework:
• **Problem Identification**: Understanding your core challenge
• **Context Analysis**: Considering constraints and situation
• **Option Evaluation**: Weighing multiple approaches
• **Risk Assessment**: Identifying potential downsides
• **Action Synthesis**: Creating implementable steps`;

    // Generate type-specific, context-aware recommendation
    const recommendationMap: Record<InsightType, string> = {
      [InsightType.FINANCE]: this._generateFinanceRecommendation(queryLower, hasTimeConstraint, hasRiskConcern),
      [InsightType.LEARNING]: this._generateLearningRecommendation(queryLower, hasTimeConstraint, hasResourceConstraint),
      [InsightType.BUSINESS]: this._generateBusinessRecommendation(queryLower, hasResourceConstraint),
      [InsightType.TRENDS]: this._generateTrendsRecommendation(queryLower, hasTimeConstraint),
      [InsightType.PERSONAL]: this._generatePersonalRecommendation(queryLower)
    };

    const recommendation = recommendationMap[type];
    const dataPoints = this._getContextualDataPoints(type, queryLower);
    const alternatives = this._getContextualAlternatives(type, queryLower);
    const riskFactors = this._getContextualRisks(type, queryLower);

    return {
      recommendation,
      explanation: {
        reasoning,
        dataPoints,
        alternatives,
        riskFactors
      }
    };
  }

  private _generateFinanceRecommendation(query: string, hasTimeConstraint: boolean, hasRisk: boolean): string {
    if (query.includes('crypto') || query.includes('blockchain') || query.includes('web3')) {
      if (query.includes('learn') || query.includes('understand') || query.includes('start') || query.includes('how')) {
        return '**Crypto Learning Path**: (1) Understand fundamentals: How does blockchain work? What problem does crypto solve? (Bankless podcast, Andreas M. Antonopoulos videos) - 1 week, (2) Learn categories: Bitcoin (store of value), Ethereum (smart contracts), DeFi (financial protocols), NFTs, Layer 2s - 2 weeks, (3) Get hands-on: Create a wallet, buy small amounts, try DEX swaps on testnet - 1 week, (4) Follow credible sources: Bankless, The Block, Crypto Briefing.\n\n**Why This Works**: Crypto requires understanding, not just price-watching. Most people lose money by investing before learning. Real value comes from understanding use cases, not following hype.';
      }
      return '**Crypto Investment Approach**: Start small (invest only 5% of portfolio max initially). Dollar-cost average into Bitcoin & Ethereum rather than trying to time bottoms. Use hardware wallet for security (Ledger/Trezor if holding $5k+). Never invest money you can\'t afford to lose - volatility is 50%+ normal.\n\n**Why This Works**: Bitcoin & Ethereum have 15-year track records. Most other crypto is speculative. Volatility is a feature, not a bug - it\'s what creates opportunity. Protecting capital matters more than getting rich quick.';
    }
    if (query.includes('beginner') || query.includes('start')) {
      return '**Recommended Approach**: Start with a diversified, low-cost index fund portfolio (like a total market fund). This provides broad exposure with minimal fees and complexity. Contribute regularly (dollar-cost averaging) regardless of market conditions.\n\n**Why This Works**: Index investing removes emotion from decisions, reduces research burden, and has been proven to beat 80% of active investors over 15+ years. Perfect for building wealth systematically.';
    }
    if (hasTimeConstraint) {
      return '**Recommended Approach**: Focus on your time horizon. Short-term (< 1 year): Keep in high-yield savings. Medium-term (1-5 years): Mix bonds and stocks. Long-term (5+ years): Heavier stock allocation. Match investment type to timeline.\n\n**Why This Works**: Time is your biggest advantage. Longer timelines allow recovery from market downturns and compound growth effects.';
    }
    if (hasRisk) {
      return '**Recommended Approach**: Build a conservative portfolio: 40% bonds, 50% diversified stocks, 10% cash. Use automatic rebalancing. Avoid timing the market; focus on consistent contributions.\n\n**Why This Works**: This allocation historically returns 6-7% annually with manageable volatility, allowing you to sleep at night while building wealth.';
    }
    return '**Recommended Approach**: Determine your investment goal (retirement, home, education) and timeframe. Create a diversified portfolio aligned with that timeline. Automate regular contributions. Review quarterly but don\'t react emotionally to market swings.\n\n**Why This Works**: Clear goals and disciplined execution beat complexity and market-timing attempts.';
  }

  private _generateLearningRecommendation(query: string, hasTimeConstraint: boolean, hasResource: boolean): string {
    if (query.includes('python') || query.includes('programming')) {
      return '**Recommended Path**: (1) Learn syntax with free Codecademy or freeCodeCamp (~2-3 weeks), (2) Build 3 small projects (~1 month), (3) Contribute to open-source (~ongoing). Spend 30 min/day minimum.\n\n**Why This Works**: Programming is learned by doing. Small projects force you to solve real problems and build muscle memory.';
    }
    if (query.includes('crypto') || query.includes('blockchain') || query.includes('web3') || query.includes('bitcoin') || query.includes('ethereum')) {
      return '**Crypto Learning Path**: (1) Understand fundamentals: How does blockchain work? What problem does crypto solve? (Bankless podcast, Andreas M. Antonopoulos videos) - 1 week, (2) Learn categories: Bitcoin (store of value), Ethereum (smart contracts), DeFi (financial protocols), NFTs, Layer 2s - 2 weeks, (3) Get hands-on: Create a wallet, buy small amounts, try DEX swaps on testnet - 1 week, (4) Follow credible sources: Bankless, The Block, Crypto Briefing.\n\n**Why This Works**: Crypto requires understanding, not just price-watching. Most people lose money by investing before learning. Real value comes from understanding use cases, not following hype.';
    }
    if (hasTimeConstraint && !query.includes('week')) {
      return '**Recommended Strategy**: Focus on deliberate practice - 1-2 hours daily of focused, challenging material. Use the Feynman Technique (teach it back simply). Join a cohort for accountability.\n\n**Why This Works**: Focused learning compounds. 30 min of active recall beats 3 hours of passive reading.';
    }
    if (hasResource) {
      return '**Recommended Approach**: Leverage free resources first (YouTube, free courses, books from library). Only pay for structured programs after you\'ve confirmed interest. Budget $500-2000 for quality paid resources if committed.\n\n**Why This Works**: You learn by doing, not buying. Expensive courses aren\'t better - your effort is what matters.';
    }
    return '**Recommended Strategy**: (1) Define specific skill goal, (2) Find 2-3 quality resources, (3) Practice daily with mini-projects, (4) Join learning community for feedback. Expect 3-6 months for meaningful competency.\n\n**Why This Works**: Learning science shows spaced repetition and active recall drive retention, not passive consumption.';
  }

  private _generateBusinessRecommendation(query: string, hasResource: boolean): string {
    if (query.includes('validate') || query.includes('idea') || query.includes('startup')) {
      return '**Recommended Approach**: Talk to 20 potential customers before building anything. Ask: "What problem does this solve?" "Would you pay for it?" "What would you pay?" Document responses. Only proceed if 70%+ show genuine interest.\n\n**Why This Works**: Most startups fail because nobody wants what they built. Validation costs $0 and saves months of wasted effort.';
    }
    if (hasResource) {
      return '**Recommended Strategy**: Bootstrap first - start with your own money/time. Build MVP with $0-1000. Get paying customers before raising capital. Only seek funding after proving traction and team.\n\n**Why This Works**: Scarce resources force focus and profitability thinking. Venture capital is a tool, not a prerequisite.';
    }
    if (query.includes('metric') || query.includes('measure')) {
      return '**Recommended Metrics to Track**: (1) CAC (Customer Acquisition Cost), (2) LTV (Lifetime Value), (3) CAC Payback Period (ideally < 12 months), (4) Churn Rate, (5) MRR Growth. Focus on LTV > 3x CAC.\n\n**Why This Works**: These metrics separate sustainable businesses from money-losing vanity projects. Everything else is noise.';
    }
    return '**Recommended Path**: (1) Validate market need (20 customer interviews), (2) Build MVP with minimal features, (3) Get first paying customers, (4) Optimize based on feedback, (5) Scale what works. Expect 6-12 months before real traction.\n\n**Why This Works**: Speed to learning beats perfection. Pivot based on real customer feedback, not assumptions.';
  }

  private _generateTrendsRecommendation(query: string, hasTimeConstraint: boolean): string {
    if (query.includes('ai')) {
      return '**Trend Assessment**: AI is in the scaling phase, not hype. Most value will accrue to companies using AI to solve real problems, not AI for AI\'s sake. Skills in prompt engineering, AI integration, and domain expertise matter more than pure ML knowledge.\n\n**Opportunity**: Focus on how to apply AI in your field rather than becoming an AI researcher, unless that\'s your passion.';
    }
    if (hasTimeConstraint) {
      return '**Trend Strategy**: Early trends (months 1-6): High risk/reward. Mainstream (months 12-24): Lower risk, crowded. Late stage (month 24+): Profitable but late. Position yourself for your risk tolerance - early exploration vs. proven players.\n\n**Why This Works**: Understanding trend lifecycle helps you avoid FOMO while capturing real opportunities.';
    }
    return '**Recommended Approach**: (1) Track signals from tech pioneers and early adopters, (2) Wait for mainstream validation before investing heavily, (3) Focus on trends solving real problems, not hype. Ask: "Does this still matter without media attention?"\n\n**Why This Works**: 90% of trending topics disappear. Only trends solving real problems sustain.';
  }

  private _generatePersonalRecommendation(query: string): string {
    if (query.includes('change') || query.includes('pivot') || query.includes('career')) {
      return '**Recommended Framework**: (1) Try it part-time first - take on a side project for 3-6 months to test assumptions, (2) Find mentors in the new field, (3) Build confidence with small wins, (4) Make the leap only when evidence supports it.\n\n**Why This Works**: Testing before committing reduces risk and regret. Most successful pivots start as explorations.';
    }
    if (query.includes('decision') || query.includes('choose')) {
      return '**Recommended Method**: List your top 3 options. For each, identify: (1) Best case outcome, (2) Worst case outcome, (3) Most likely outcome, (4) Reversibility. Choose the option with best expected value that you can reverse if needed.\n\n**Why This Works**: Most decisions are more reversible than we think. Clarity on outcomes removes emotional paralysis.';
    }
    
    // Generic handler for ANY topic - extract key terms and provide actionable advice
    const topic = query.split(/\s+/).slice(0, 3).join(' ').replace(/[?!\.]/g, '');
    
    return `**How to Approach "${topic}"**: (1) **Learn the Basics**: Find 2-3 credible sources (books, courses, experts). Spend 1-2 weeks getting foundational knowledge. (2) **Get Hands-On**: Apply what you learn through small projects or experiments. This is where real understanding happens. (3) **Find Your Angle**: Discover what aspect interests you most - this drives long-term engagement. (4) **Build Community**: Connect with others learning or working in this space - shared knowledge accelerates growth.\n\n**Why This Works**: Any skill, business, or topic follows the same learning arc: awareness → understanding → practice → mastery. The timeline varies, but the process is universal.`;
  }

  private _getContextualDataPoints(type: InsightType, query: string): string[] {
    // Context-aware data points based on query keywords
    const contextPoints = new Map<string, string[]>([
      ['finance', [
        'Current market volatility and economic conditions',
        'Your specific risk tolerance and time horizon',
        'Inflation impact on purchasing power',
        'Tax implications of your decision',
        'Historical returns and correlation patterns'
      ]],
      ['learning', [
        'Your current baseline knowledge level',
        'Available time and learning capacity',
        'Preferred learning style (visual, hands-on, social)',
        'Job market demand for this skill',
        'Foundational knowledge required'
      ]],
      ['business', [
        'Total addressable market size and growth rate',
        'Competitive landscape and differentiation needs',
        'Unit economics and profitability pathways',
        'Team skills and resource availability',
        'Regulatory and market barriers to entry'
      ]],
      ['trends', [
        'Early adoption rates and technology maturity',
        'Major players and incumbent threats',
        'Regulatory and societal acceptance',
        'Capital flowing into the space',
        'Media coverage trajectory and sentiment'
      ]],
      ['personal', [
        'Your core values and long-term vision',
        'Current circumstances and constraints',
        'Support system and available resources',
        'Past successes and learning from failures',
        'Energy levels and motivation drivers'
      ]]
    ]);

    const basePoints = contextPoints.get(type) || [];
    
    // Add query-specific points if keywords detected
    if (query.includes('time') || query.includes('timeline')) {
      basePoints.push('Timeline and milestones for your decision');
    }
    if (query.includes('money') || query.includes('budget') || query.includes('cost')) {
      basePoints.push('Financial constraints and resource availability');
    }
    if (query.includes('risk') || query.includes('fail') || query.includes('safe')) {
      basePoints.push('Risk tolerance and downside protection needs');
    }

    return basePoints.slice(0, 5); // Return top 5 points
  }

  private _getContextualAlternatives(type: InsightType, query: string): string[] {
    const alternatives: Record<InsightType, string[]> = {
      [InsightType.FINANCE]: [
        'Conservative approach (bonds, savings, low volatility)',
        'Balanced approach (diversified 60/40 portfolio)',
        'Growth approach (heavy equity focus)',
        'Alternative assets (real estate, commodities, crypto)'
      ],
      [InsightType.LEARNING]: [
        'Self-directed learning with free resources',
        'Structured programs (bootcamps, degrees)',
        'Mentorship and apprenticeship model',
        'Online courses with peer community'
      ],
      [InsightType.BUSINESS]: [
        'Bootstrap with limited capital',
        'Seek investor funding early',
        'Partnership or acquisition approach',
        'Franchise or licensed model'
      ],
      [InsightType.TRENDS]: [
        'Early adoption (highest risk/reward)',
        'Wait and verify trend validity',
        'Invest in supporting infrastructure',
        'Avoid entirely (focus on core business)'
      ],
      [InsightType.PERSONAL]: [
        'Incremental change (optimize current path)',
        'Radical pivot (major change)',
        'Hybrid approach (parallel exploration)',
        'Status quo with small adjustments'
      ]
    };

    return alternatives[type];
  }

  private _getContextualRisks(type: InsightType, query: string): string[] {
    const risks: Record<InsightType, string[]> = {
      [InsightType.FINANCE]: [
        'Market downturns and volatility',
        'Inflation eroding returns',
        'Concentration risk in few investments',
        'Emotional decision-making during crises',
        'Fees and hidden costs'
      ],
      [InsightType.LEARNING]: [
        'Skill becoming obsolete quickly',
        'Opportunity cost of learning time',
        'Quality variance in resources',
        'Motivation and follow-through challenges',
        'Market saturation in skill area'
      ],
      [InsightType.BUSINESS]: [
        'Market adoption slower than expected',
        'Competition emerging unexpectedly',
        'Team execution challenges',
        'Capital requirements exceeding projections',
        'Regulatory changes or barriers'
      ],
      [InsightType.TRENDS]: [
        'Trend reversal or bubble burst',
        'Early entry losses while trend stabilizes',
        'Regulatory backlash against trend',
        'Better alternatives emerging',
        'False signals that fade quickly'
      ],
      [InsightType.PERSONAL]: [
        'Fear and comfort zone resistance',
        'Social pressure from others',
        'Resource constraints and limitations',
        'Unforeseen obstacles mid-journey',
        'Motivation loss after initial excitement'
      ]
    };

    let riskList = risks[type];

    // Add contextual risks based on query
    if (query.includes('quick') || query.includes('fast')) {
      riskList = [...riskList, 'Rushing creates blind spots'];
    }
    if (query.includes('alone') || query.includes('solo')) {
      riskList = [...riskList, 'Lack of support and accountability'];
    }

    return riskList.slice(0, 5);
  }

  private _extractActionableSteps(recommendation: string, type: InsightType): string[] {
    const steps: Record<InsightType, string[]> = {
      [InsightType.FINANCE]: [
        'Review your current financial position and cash flow',
        'Identify your specific goal and timeline',
        'Research options aligned with your risk tolerance',
        'Create a simple action plan with milestones',
        'Monitor and adjust quarterly'
      ],
      
      [InsightType.LEARNING]: [
        'Define your specific learning objective',
        'Find quality resources (courses, books, mentors)',
        'Create a daily practice routine (even 30 min/day)',
        'Join a community for accountability and feedback',
        'Apply knowledge in real projects'
      ],
      
      [InsightType.BUSINESS]: [
        'Validate your core assumptions with 10-20 conversations',
        'Build a minimum viable product (MVP) to test',
        'Measure key metrics that matter to your business',
        'Find early customers and iterate based on feedback',
        'Plan your go-to-market strategy'
      ],
      
      [InsightType.TRENDS]: [
        'Follow early-stage signals and thought leaders',
        'Identify players positioned to benefit or lose',
        'Assess regulatory and technological barriers',
        'Plan your entry timing and positioning',
        'Create contingency plans for alternative futures'
      ],
      
      [InsightType.PERSONAL]: [
        'Clarify your values and what matters most',
        'Set 1-3 meaningful goals for the next 90 days',
        'Design your environment to support change',
        'Build accountability systems (buddy, coach, community)',
        'Review progress weekly and celebrate wins'
      ]
    };

    return steps[type] || ['Take action', 'Monitor results', 'Iterate'];
  }

  private async _generateDeepAnalysis(insight: Insight): Promise<string> {
    const deepAnalysisMap: Record<InsightType, string> = {
      [InsightType.FINANCE]: `**Advanced Financial Context:**
• Historical market patterns suggest 3-5 year cycles
• Current economic indicators show varied momentum
• Diversification across asset classes reduces volatility
• Time horizon matters: short-term (< 1yr) vs long-term (5+ yrs)`,
      
      [InsightType.LEARNING]: `**Learning Path Optimization:**
• Spaced repetition improves retention by 40-50%
• Active recall (testing yourself) is 2x more effective than passive reading
• Communities and peer learning accelerate mastery
• Skill stacking creates compound value`,
      
      [InsightType.BUSINESS]: `**Business Model Insights:**
• Unit economics matter more than topline revenue
• Customer acquisition cost (CAC) payback period should be < 12 months
• Network effects create defensible moats
• Market timing is less important than execution quality`,
      
      [InsightType.TRENDS]: `**Trend Analysis Framework:**
• Early indicators precede mainstream adoption by 6-18 months
• Technology S-curves show predictable adoption patterns
• Regulatory environment can accelerate or block trends
• Contrarian takes often emerge as consensus reaches peaks`,
      
      [InsightType.PERSONAL]: `**Personal Development Context:**
• Habits compound: small changes create outsized long-term effects
• Identity-based habits (who you are) beat goal-based habits (what you achieve)
• Environmental design is 90% of success, willpower is 10%
• Progress tracking reveals patterns invisible to intuition`
    };

    return deepAnalysisMap[insight.type] || 'Detailed analysis framework applied.';
  }

}
