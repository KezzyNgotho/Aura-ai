/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Durable Object binding for Aura AI
  AURA_AI_SERVER: DurableObjectNamespace;

  // KV Namespace for token tracking, insights, and transactions
  AURA_KV: KVNamespace;

  // GPT API key (for GPT-5)
  GPT_API_KEY: string;

  // Auth and crypto keys
  AUTH_SECRET?: string;
  ETHERSCAN_API_KEY?: string;
  WALLET_PRIVATE_KEY?: string;
  BASE_RPC_URL?: string;
}
