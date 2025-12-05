/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Durable Object binding for Aura AI
  AURA_AI_SERVER: DurableObjectNamespace;

  // KV Namespace for token tracking, insights, and transactions
  AURA_KV: KVNamespace;

  // GPT API key (for GPT-5)
  GPT_API_KEY?: string;

  // Auth and crypto keys
  AUTH_SECRET?: string;
  ETHERSCAN_API_KEY?: string;
  WALLET_PRIVATE_KEY?: string;
  BASE_RPC_URL?: string;

  // Smart contract addresses (Ethereum Sepolia)
  AURA_TOKEN_ADDRESS?: string;
  REWARDS_MINTER_ADDRESS?: string;
  TOKEN_CONVERTER_ADDRESS?: string;
  AGENT_MARKETPLACE_ADDRESS?: string;
  RPC_URL?: string;
  CHAIN_ID?: string;
  NETWORK?: string;

  // EdenLayer Integration (Agent Discovery & Reputation)
  EDENLAYER_API_KEY?: string;
  EDENLAYER_SERVICE_ID?: string;

  // ThirdWeb SDK
  THIRDWEB_SECRET_KEY?: string;
}
