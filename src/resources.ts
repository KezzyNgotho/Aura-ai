import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function setupServerResources(server: McpServer) {
  /**
   * Query Resource - Access user queries for transparency and agent collaboration
   */
  server.resource(
    'getQuery',
    'aura://queries/{userId}/{queryId}',
    async (uri: URL) => {
      try {
        const parts = uri.pathname.split('/');
        const userId = parts[parts.length - 2];
        const queryId = parts[parts.length - 1];

        // In a real implementation, fetch from KV or database
        return {
          contents: [
            {
              text: `Query ID: ${queryId}\nUser: ${userId}\n\nQuery resources enable agents to access user questions and collaborate on insights.`,
              uri: uri.href
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching query:', error);
        throw new Error(`Failed to fetch query: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Insight Resource - Access generated insights with full transparency
   */
  server.resource(
    'getInsight',
    'aura://insights/{insightId}',
    async (uri: URL) => {
      try {
        const parts = uri.pathname.split('/');
        const insightId = parts[parts.length - 1];

        return {
          contents: [
            {
              text: `Insight ID: ${insightId}\n\nThis resource provides transparent insight data including:\n- Recommendation\n- Detailed explanation and reasoning\n- Actionable steps\n- Data points and alternatives considered\n- Risk factors\n\nEnables other agents to verify, build upon, or challenge insights.`,
              uri: uri.href
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching insight:', error);
        throw new Error(`Failed to fetch insight: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Token Transaction Resource - Full transparency of token economy
   */
  server.resource(
    'getTransaction',
    'aura://transactions/{userId}/{transactionId}',
    async (uri: URL) => {
      try {
        const parts = uri.pathname.split('/');
        const userId = parts[parts.length - 2];
        const transactionId = parts[parts.length - 1];

        return {
          contents: [
            {
              text: `Transaction ID: ${transactionId}\nUser: ${userId}\n\nTransaction resources track all token movements:\n- Amount\n- Type (earn/spend)\n- Reason/description\n- Timestamp\n- Associated insight/query\n\nEnables full audit trail and economic transparency.`,
              uri: uri.href
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching transaction:', error);
        throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * User Profile Resource - Enables agent collaboration on user context
   */
  server.resource(
    'getUserProfile',
    'aura://profiles/{userId}',
    async (uri: URL) => {
      try {
        const parts = uri.pathname.split('/');
        const userId = parts[parts.length - 1];

        return {
          contents: [
            {
              text: `User Profile: ${userId}\n\nProfile includes:\n- Token balance and history\n- Inquiry patterns and preferences\n- Favorite insight types\n- Platform preferences\n- Transparency settings\n- Settings and configurations\n\nEnables other agents to provide contextualized assistance.`,
              uri: uri.href
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw new Error(`Failed to fetch profile: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Insight Catalog Resource - Browse all insights for pattern discovery
   */
  server.resource(
    'getInsightCatalog',
    'aura://catalog/insights?type={type}&limit={limit}',
    async (uri: URL) => {
      try {
        const searchParams = uri.searchParams;
        const type = searchParams.get('type') || 'all';
        const limit = searchParams.get('limit') || '20';

        return {
          contents: [
            {
              text: `Insight Catalog - Type: ${type}, Limit: ${limit}\n\nThis resource enables:\n- Discovery of similar insights\n- Pattern recognition across user queries\n- Trending topics and insights\n- Quality metrics and engagement\n- Agent-to-agent knowledge sharing\n\nSupports collaborative intelligence across the Aura-AI network.`,
              uri: uri.href
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching insight catalog:', error);
        throw new Error(`Failed to fetch catalog: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
} 