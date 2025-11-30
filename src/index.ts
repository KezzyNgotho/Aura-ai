import { AuraAiServer } from './aura-ai-server';
import { Env } from './env';

export { AuraAiServer }; // REQUIRED for Durable Object binding

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', message: 'Aura-AI is running' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route all other requests to Durable Object
    const sessionIdStr = url.searchParams.get('sessionId') || 'default-session';
    
    try {
      // Get Durable Object ID & stub
      const id = env.AURA_AI_SERVER.idFromName(sessionIdStr);
      const obj = env.AURA_AI_SERVER.get(id);

      // Forward to Durable Object
      return obj.fetch(request.clone());
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to process request'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
