/**
 * Aura Squad Query Processor
 * Focuses entirely on forming agent squads to solve problems together
 * Uses AI for intelligent intent detection
 */

import { AIService } from './ai-service';

export interface QueryRequest {
  userId: string;
  query: string;
}

export interface SquadRole {
  title: string;
  description: string;
  expertise: string[];
}

export interface SquadSuggestion {
  squadName: string;
  emoji: string;
  description: string;
  roles: SquadRole[];
  estimatedTime: string;
  estimatedReward: number;
}

export interface AuraResponse {
  message: string;
  squadSuggestion: SquadSuggestion;
  actionText: string;
}

export class QueryProcessor {
  private aiService: AIService;

  constructor(apiKey?: string) {
    this.aiService = new AIService(apiKey);
  }

  async processQuery(request: QueryRequest): Promise<AuraResponse> {
    // Use AI to analyze the query
    const analysis = await this.aiService.analyzeQuery(request.query);

    // If it's a greeting, return a greeting response
    if (analysis.isGreeting) {
      return {
        message: analysis.greetingResponse || '👋 Hey! Welcome to Aura Squad! What would you like to accomplish?',
        squadSuggestion: {
          squadName: 'Welcome',
          emoji: '👋',
          description: 'Tell me what you want to achieve and I\'ll form the perfect squad for you!',
          roles: [
            {
              title: 'Your Squad Guide',
              description: 'Ready to help you form the perfect team',
              expertise: ['guidance', 'squad-assembly', 'problem-solving']
            }
          ],
          estimatedTime: 'Let\'s get started!',
          estimatedReward: 0
        },
        actionText: 'Tell me what you need!'
      };
    }

    // If it's a conversational query, return conversational response
    if (analysis.isConversational) {
      return {
        message: analysis.conversationalResponse || 'I hear you. Tell me more about what you\'re going through.',
        squadSuggestion: {
          squadName: 'Support & Wellness',
          emoji: '💙',
          description: 'Sometimes we all need someone to talk to. Want to form a support squad or keep chatting?',
          roles: [
            {
              title: 'Active Listener',
              description: 'Someone who listens and understands',
              expertise: ['empathy', 'listening', 'support']
            },
            {
              title: 'Advisor',
              description: 'Offers perspective and guidance',
              expertise: ['wisdom', 'perspective', 'mentoring']
            }
          ],
          estimatedTime: 'Anytime you need',
          estimatedReward: 0
        },
        actionText: 'Form Support Squad'
      };
    }

    // Get the appropriate squad based on AI analysis
    const squadType = analysis.squadType || 'problem_solving';
    const squad = this.getSquadByType(squadType);

    // Generate a custom message using AI
    const customMessage = await this.aiService.generateSquadMessage(
      analysis.userIntent,
      squad.squadName,
      squad.description
    );

    const message = `${customMessage}`;
    const actionText = `Form "${squad.squadName}" Squad`;

    return {
      message,
      squadSuggestion: squad,
      actionText
    };
  }

  /**
   * Get squad configuration by type
   */
  private getSquadByType(squadType: string): SquadSuggestion {
    switch (squadType) {
      case 'adventure_planning':
        return this.getAdventurePlanningSquad();
      case 'fitness_wellness':
        return this.getFitnessWellnessSquad();
      case 'business_launch':
        return this.getBusinessLaunchSquad();
      case 'content_creation':
        return this.getContentCreationSquad();
      case 'learning_mastery':
        return this.getLearningMasterySquad();
      case 'problem_solving':
      default:
        return this.getProblemSolvingSquad();
    }
  }

  private getAdventurePlanningSquad(): SquadSuggestion {
    return {
      squadName: 'Adventure Planning Squad',
      emoji: '🗺️',
      description: 'Plan the perfect trip with your squad. We handle routes, budget, accommodations, activities, and safety. Turn a boring plan into an epic adventure!',
      roles: [
        {
          title: 'Route Expert',
          description: 'Maps out the best routes and logistics',
          expertise: ['navigation', 'logistics', 'planning']
        },
        {
          title: 'Budget Guru',
          description: 'Finds the cheapest flights, hotels, and deals',
          expertise: ['budgeting', 'pricing', 'negotiation']
        },
        {
          title: 'Activity Planner',
          description: 'Discovers amazing experiences and hidden gems',
          expertise: ['entertainment', 'experiences', 'local knowledge']
        },
        {
          title: 'Safety Advisor',
          description: 'Checks travel warnings and keeps everyone safe',
          expertise: ['safety', 'health', 'regulations']
        }
      ],
      estimatedTime: '2-4 hours',
      estimatedReward: 40
    };
  }

  private getFitnessWellnessSquad(): SquadSuggestion {
    return {
      squadName: 'Fitness & Wellness Squad',
      emoji: '💪',
      description: 'Get fit with your dream squad! We create personalized workouts, meal plans, track progress, and keep you hyped. Achieve your fitness goals together!',
      roles: [
        {
          title: 'Fitness Coach',
          description: 'Creates personalized workout programs',
          expertise: ['training', 'exercise', 'form']
        },
        {
          title: 'Nutritionist',
          description: 'Plans meals and nutrition strategy',
          expertise: ['nutrition', 'meal planning', 'diet']
        },
        {
          title: 'Motivator',
          description: 'Keeps the energy and hype high',
          expertise: ['motivation', 'psychology', 'accountability']
        },
        {
          title: 'Progress Tracker',
          description: 'Logs results and celebrates wins',
          expertise: ['analytics', 'tracking', 'celebration']
        }
      ],
      estimatedTime: '1-2 hours',
      estimatedReward: 30
    };
  }

  private getBusinessLaunchSquad(): SquadSuggestion {
    return {
      squadName: 'Business Launch Squad',
      emoji: '🚀',
      description: 'Turn your business idea into reality with expert co-founders! We handle market research, design, copywriting, marketing, and finances. Go from idea to launch in hours!',
      roles: [
        {
          title: 'Market Researcher',
          description: 'Identifies hot niches and opportunities',
          expertise: ['market analysis', 'trends', 'validation']
        },
        {
          title: 'Product Designer',
          description: 'Creates beautiful designs and visuals',
          expertise: ['design', 'ui/ux', 'branding']
        },
        {
          title: 'Copywriter',
          description: 'Writes compelling sales and marketing copy',
          expertise: ['writing', 'persuasion', 'messaging']
        },
        {
          title: 'Growth Strategist',
          description: 'Plans marketing channels and growth tactics',
          expertise: ['marketing', 'growth', 'sales']
        },
        {
          title: 'Financial Advisor',
          description: 'Handles pricing, funding, and budgets',
          expertise: ['finance', 'pricing', 'investment']
        }
      ],
      estimatedTime: '4-8 hours',
      estimatedReward: 60
    };
  }

  private getContentCreationSquad(): SquadSuggestion {
    return {
      squadName: 'Content Creation Squad',
      emoji: '🎬',
      description: 'Create viral content with your dream team! We handle filming, editing, music, captions, and strategy. Go from idea to viral hit faster than you think!',
      roles: [
        {
          title: 'Director',
          description: 'Oversees creative vision and storytelling',
          expertise: ['direction', 'storytelling', 'cinematography']
        },
        {
          title: 'Video Editor',
          description: 'Crafts smooth edits and visual effects',
          expertise: ['editing', 'motion graphics', 'color grading']
        },
        {
          title: 'Sound Designer',
          description: 'Adds music, sound effects, and audio quality',
          expertise: ['audio', 'music selection', 'sound effects']
        },
        {
          title: 'Trend Analyst',
          description: 'Keeps content fresh with latest trends',
          expertise: ['trends', 'algorithms', 'audience insights']
        }
      ],
      estimatedTime: '2-6 hours per piece',
      estimatedReward: 35
    };
  }

  private getLearningMasterySquad(): SquadSuggestion {
    return {
      squadName: 'Learning & Mastery Squad',
      emoji: '📚',
      description: 'Master any skill with study partners! We find resources, explain concepts, practice together, and keep you accountable. Level up faster with your squad!',
      roles: [
        {
          title: 'Resource Curator',
          description: 'Finds the best courses and materials',
          expertise: ['research', 'curation', 'learning']
        },
        {
          title: 'Expert Tutor',
          description: 'Explains complex concepts clearly',
          expertise: ['teaching', 'explanation', 'clarity']
        },
        {
          title: 'Practice Partner',
          description: 'Practices with you and gives feedback',
          expertise: ['practice', 'feedback', 'collaboration']
        },
        {
          title: 'Accountability Buddy',
          description: 'Keeps you on track and motivated',
          expertise: ['motivation', 'accountability', 'consistency']
        }
      ],
      estimatedTime: '1-4 hours per week',
      estimatedReward: 25
    };
  }

  private getProblemSolvingSquad(): SquadSuggestion {
    return {
      squadName: 'Problem-Solving Squad',
      emoji: '🎯',
      description: 'Form a powerful squad to tackle your challenge! We research, strategize, brainstorm solutions, and execute together. Let\'s solve this as a team!',
      roles: [
        {
          title: 'Strategist',
          description: 'Plans the overall approach and strategy',
          expertise: ['strategy', 'planning', 'analysis']
        },
        {
          title: 'Researcher',
          description: 'Gathers information and insights',
          expertise: ['research', 'analysis', 'validation']
        },
        {
          title: 'Implementer',
          description: 'Executes the solution',
          expertise: ['execution', 'building', 'action']
        },
        {
          title: 'Quality Checker',
          description: 'Validates and refines the solution',
          expertise: ['testing', 'validation', 'refinement']
        }
      ],
      estimatedTime: '2-6 hours',
      estimatedReward: 40
    };
  }
}
