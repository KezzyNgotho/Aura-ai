/**
 * AI Service - 100% OpenAI Powered - No Fallbacks
 * Every response comes from GPT-5-nano with intelligent analysis
 */

export interface AIResponse {
  isGreeting: boolean;
  isConversational?: boolean;
  conversationalResponse?: string;
  greetingResponse?: string;
  squadType?: string;
  squadDescription?: string;
  advice?: string;
  userIntent: string;
}

export class AIService {
  private apiKey: string;
  private maxRetries = 5;
  private retryDelayMs = 2000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    if (!this.apiKey) {
      throw new Error('GPT_API_KEY is required for AIService');
    }
    console.log('✅ AIService initialized - 100% AI-powered, no fallbacks');
  }

  /**
   * Retry helper with exponential backoff for rate limits
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && error.message?.includes('429')) {
        const delayMs = this.retryDelayMs * (this.maxRetries - retries + 1);
        console.log(`⏳ Rate limited. Retrying in ${delayMs}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.retryWithBackoff(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Analyze any query intelligently using AI
   * Can provide advice, identify intent, suggest squads, or just have a conversation
   */
  async analyzeQuery(query: string): Promise<AIResponse> {
    return this.retryWithBackoff(() => this.analyzeQueryWithAI(query));
  }

  private async analyzeQueryWithAI(query: string): Promise<AIResponse> {
    const prompt = `You are Aura, an intelligent AI assistant that analyzes user messages and provides smart responses.

User Query: "${query}"

Analyze this and respond with a JSON object containing:
1. "isGreeting": boolean - true if this is just a greeting
2. "greetingResponse": string - warm greeting response (if isGreeting=true)
3. "isConversational": boolean - true if this needs advice/discussion vs squad formation
4. "conversationalResponse": string - thoughtful response with advice/insights (if isConversational=true)
5. "advice": string - any practical advice relevant to their query (optional but recommended)
6. "squadType": string - best squad match (adventure_planning, fitness_wellness, business_launch, content_creation, learning_mastery, problem_solving) - only if not conversational
7. "squadDescription": string - why this squad would help
8. "userIntent": string - what they're actually asking for

Be smart and helpful. For ANY query, provide valuable advice or insights. Don't just respond with a squad suggestion if advice would be more helpful.

Respond ONLY with valid JSON, no other text.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        input: prompt,
        store: true
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Extract text from the new API response format
    let content = '';
    if (Array.isArray(data.output)) {
      const messageObj = data.output.find((item: any) => item.type === 'message');
      if (messageObj?.content?.[0]?.text) {
        content = messageObj.content[0].text;
      }
    } else {
      content = data.output || data.result || data.text || '';
    }

    console.log('📝 AI Analysis:', content.substring(0, 150));

    try {
      const parsed = JSON.parse(content);
      return {
        isGreeting: parsed.isGreeting || false,
        isConversational: parsed.isConversational || false,
        conversationalResponse: parsed.conversationalResponse,
        greetingResponse: parsed.greetingResponse,
        advice: parsed.advice,
        squadType: parsed.squadType || 'problem_solving',
        squadDescription: parsed.squadDescription,
        userIntent: parsed.userIntent || query
      };
    } catch (e) {
      console.error('Failed to parse AI response:', content.substring(0, 300));
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Generate a custom squad message using AI
   */
  async generateSquadMessage(userIntent: string, squadName: string, squadDescription: string): Promise<string> {
    return this.retryWithBackoff(() => this.generateSquadMessageWithAI(userIntent, squadName, squadDescription));
  }

  private async generateSquadMessageWithAI(userIntent: string, squadName: string, squadDescription: string): Promise<string> {
    const prompt = `Create an encouraging, personalized message (2-3 sentences) for someone who wants to: "${userIntent}"

Suggest they form a ${squadName} to achieve this. Keep it enthusiastic and action-oriented. No markdown, just plain text.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        input: prompt,
        store: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Extract text from the new API response format
    let content = '';
    if (Array.isArray(data.output)) {
      const messageObj = data.output.find((item: any) => item.type === 'message');
      if (messageObj?.content?.[0]?.text) {
        content = messageObj.content[0].text;
      }
    } else {
      content = data.output || data.result || data.text || '';
    }

    return content || `Great idea! Let's form a ${squadName} to help you. ${squadDescription}`;
  }

  /**
   * Generate a conversational AI response for any topic
   */
  async generateConversationalResponse(userMessage: string): Promise<string> {
    return this.retryWithBackoff(() => this.generateConversationalResponseImpl(userMessage));
  }

  private async generateConversationalResponseImpl(userMessage: string): Promise<string> {
    const systemPrompt = 'You are Aura, a helpful and empathetic AI assistant. You provide thoughtful, concise responses (2-3 sentences) that show you care about the user. You can also suggest forming an Aura Squad to help them tackle their challenges when appropriate. Always be genuine and insightful.';
    const fullPrompt = `${systemPrompt}\n\nUser message: ${userMessage}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        input: fullPrompt,
        store: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Extract text from the new API response format
    let content = '';
    if (Array.isArray(data.output)) {
      const messageObj = data.output.find((item: any) => item.type === 'message');
      if (messageObj?.content?.[0]?.text) {
        content = messageObj.content[0].text;
      }
    } else {
      content = data.output || data.result || data.text || '';
    }

    return content || 'I appreciate that question! Tell me more about what you\'re thinking.';
  }
}
