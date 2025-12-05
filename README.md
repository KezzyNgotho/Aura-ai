# Aura AI - Social AI Network & Token Economy Platform

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/KezzyNgotho/Aura-ai)

**A transparent, collaborative AI recommendation engine built on the Model Context Protocol (MCP) with integrated token economy, squad-based collaboration, and blockchain rewards.**

## 🌟 Live Demo

**Production URL:** https://aura-ai.keziengotho18.workers.dev

## 🚀 Features

### 🤖 Core AI Capabilities
- **Transparent AI Reasoning**: Complete reasoning process visibility (not a black box)
- **Multi-Category Insights**: Finance, Learning, Business, Health, Technology, and more
- **Real-time Collaboration**: Comments, voting, and squad-based discussions
- **Intelligent Squad Agents**: AI-powered squad management and optimization
- **OpenAI GPT Integration**: Powered by latest GPT models for intelligent responses
- **Query Processing**: Context-aware query processing with squad intelligence

### 👥 Social Platform
- **Squad Creation & Management**: Form collaborative groups with shared goals
- **Real-time Chat**: Persistent chat history with Cloudflare KV storage
- **User Profiles**: Wallet-based authentication with MetaMask integration
- **Token Economy**: Earn AURA tokens for engagement and contributions
- **Activity Tracking**: Real-time user activity and contribution monitoring

### 💰 Token Economy & Rewards
- **AURA Token System**: Native platform token for engagement rewards
- **Multiple Distribution Methods**:
  - Equal distribution among squad members
  - Contribution-based weighting (by activity level)
  - Activity-based rewards (by message count and engagement)
- **USDC Integration**: Convert AURA to USDC on Base chain
- **Smart Contract Rewards**: On-chain reward minting and distribution
- **Reward Analytics**: Track earnings and distribution history

### ⛓️ Blockchain Integration
- **MetaMask Wallet**: Seamless Web3 wallet integration
- **Base Chain**: Ethereum L2 for fast, low-cost transactions
- **Smart Contracts**: Custom contracts for token economy
- **ThirdWeb Integration**: Simplified contract deployment and management
- **OpenZeppelin Libraries**: Battle-tested smart contract components

## 🛠️ Technology Stack

### Backend & Infrastructure
- **Cloudflare Workers**: Serverless edge computing platform
- **Hono.js**: Fast, lightweight web framework for Cloudflare Workers
- **TypeScript**: Full type safety and modern JavaScript features
- **Cloudflare KV**: High-performance key-value storage for chat history and user data
- **Cloudflare Durable Objects**: Real-time collaborative state management
- **Wrangler CLI**: Cloudflare Workers development and deployment tool

### 🤖 AI & MCP Integration
- **Model Context Protocol (MCP)**: Industry-standard protocol for AI agent communication
- **NullShot MCP Framework**: Advanced MCP implementation with testing utilities
- **NullShot TypeScript Agent Framework**: Build intelligent agents powered by LLMs
- **OpenAI GPT API**: Latest GPT models for intelligent responses
- **Intelligent Squad Agents**: AI-powered squad optimization and management
- **Query Processor**: Context-aware query processing with squad intelligence

### ⛓️ Blockchain & Smart Contracts
- **ThirdWeb**: Simplified Web3 development and deployment platform
- **Hardhat**: Ethereum development environment for smart contracts
- **Solidity**: Smart contract development language
- **OpenZeppelin**: Battle-tested smart contract libraries
- **Base Chain**: Ethereum Layer 2 for fast, low-cost transactions
- **MetaMask**: Web3 wallet integration
- **Ethers.js**: Ethereum JavaScript library

### 🎨 Frontend & UI
- **Vanilla JavaScript**: No heavy frameworks, fast and lightweight
- **Server-Side Rendering**: HTML templates with embedded JavaScript
- **CSS3**: Modern styling with gradients and animations
- **Font Awesome**: Rich icon library for UI elements
- **Google Fonts**: Poppins typography for modern design
- **Responsive Design**: Mobile-first approach with adaptive layouts

### 🧪 Development & Testing
- **Vitest**: Fast unit testing framework
- **ESLint & Prettier**: Code quality and formatting tools
- **MCP Inspector**: Debug and monitor MCP communications
- **TypeScript Compiler**: Advanced type checking and compilation
- **Git**: Version control with GitHub integration

### 📦 Package Management & Build Tools
- **pnpm**: Fast, disk-efficient package manager
- **Node.js 18+**: JavaScript runtime environment
- **npm scripts**: Build and development automation
- **Environment Variables**: Secure configuration management

## 📁 Project Structure

```
├── src/
│   ├── aura-ai-server.ts          # Main server with all features
│   ├── auth-service.ts             # MetaMask wallet authentication
│   ├── squad-service.ts            # Squad creation and management
│   ├── token-service.ts            # AURA token economy
│   ├── ai-service.ts               # OpenAI GPT integration
│   ├── intelligent-squad-agent.ts  # AI squad optimization
│   ├── smart-contract-integration.ts # Blockchain integration
│   ├── edenlayer-integration.ts    # Eden AI layer
│   ├── query-processor-squad.ts    # Squad query processing
│   ├── tools.ts                    # MCP tools
│   ├── resources.ts                # MCP resources
│   ├── prompts.ts                  # MCP prompts
│   └── env.d.ts                    # TypeScript environment types
├── contracts/                      # Solidity smart contracts
│   ├── AuraToken.sol              # AURA token contract
│   ├── RewardsMinter.sol          # Reward distribution
│   ├── TokenConverter.sol         # AURA to USDC conversion
│   └── AgentMarketplace.sol       # AI agent marketplace
├── scripts/                        # Deployment and utility scripts
│   ├── deploy-contracts.js        # Contract deployment
│   ├── hardhat-deploy.js          # Hardhat deployment
│   └── thirdweb-deploy.js         # ThirdWeb deployment
├── test/                          # Test suites
│   ├── client.test.ts             # Client-side tests
│   └── *.test.ts                  # Additional test files
├── artifacts/                     # Compiled contract artifacts
├── public/                        # Static assets
├── AURA_AI_DOCS.md               # Detailed documentation
├── wrangler.jsonc                 # Cloudflare Workers config
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.mts              # Testing configuration
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**: JavaScript runtime
- **pnpm**: Package manager (`npm install -g pnpm`)
- **MetaMask**: Browser wallet extension (for Web3 features)
- **Git**: Version control system

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KezzyNgotho/Aura-ai.git
   cd aura-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

4. **Set Cloudflare Secrets**
   ```bash
   # Set OpenAI API key as secret
   npx wrangler secret put GPT_API_KEY
   # Enter your OpenAI API key when prompted
   ```

### Development

```bash
# Start development server with MCP Inspector
pnpm run dev

# Start only the worker
pnpm start

# Run tests
pnpm test

# Generate Cloudflare types
pnpm run cf-typegen

# Lint code
pnpm run lint

# Format code
pnpm run format
```

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Deploy smart contracts
pnpm run deploy:contracts
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# ThirdWeb Configuration (optional - browser auth used if empty)
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key_here

# Private Key for Contract Deployment (REQUIRED)
# Format: 0x + exactly 64 hex characters (32 bytes)
# This is your MetaMask private key for contract deployment
PRIVATE_KEY=0x_your_private_key_here

# Optional: Additional configuration
NODE_ENV=development
```

### Cloudflare Secrets

Set these using Wrangler CLI:
```bash
# OpenAI API key for AI responses
npx wrangler secret put GPT_API_KEY

# ThirdWeb secret key (optional)
npx wrangler secret put THIRDWEB_SECRET_KEY
```

### Smart Contract Deployment

1. **Using ThirdWeb (Recommended)**
   ```bash
   pnpm run deploy:thirdweb
   ```

2. **Using Hardhat**
   ```bash
   pnpm run deploy:hardhat
   ```

## 🎯 Key Components

### Squad Management System
- **Create Squads**: Form collaborative groups with shared objectives
- **Invite Members**: Add participants with role-based permissions
- **AI Optimization**: Intelligent squad recommendations and optimization
- **Activity Tracking**: Real-time monitoring of member contributions
- **Reward Distribution**: Automated token distribution based on activity

### Advanced Token Economy
- **AURA Token**: Native platform currency earned through engagement
- **Multi-Algorithm Distribution**:
  - **Equal**: Fair distribution to all active members
  - **Contribution**: Weighted by quality and quantity of contributions
  - **Activity**: Based on message count and interaction levels
- **USDC Conversion**: Seamless conversion to stablecoin on Base
- **Smart Contract Minting**: On-chain reward verification and distribution

### AI Integration Layer
- **OpenAI GPT**: Latest models for intelligent, context-aware responses
- **MCP Protocol**: Industry-standard AI agent communication
- **Squad Intelligence**: AI-powered squad management and recommendations
- **Query Processing**: Advanced natural language processing
- **Transparent Reasoning**: Complete visibility into AI decision-making

### Blockchain Infrastructure
- **MetaMask Integration**: Seamless Web3 wallet connectivity
- **Base Chain**: High-performance Ethereum L2 network
- **Custom Smart Contracts**: Purpose-built contracts for token economy
- **ThirdWeb Tools**: Simplified Web3 development and deployment
- **OpenZeppelin Security**: Battle-tested contract components

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage report
pnpm test --coverage

# Run integration tests with MCP
pnpm run test:integration

# Run specific test file
pnpm test src/squad-service.test.ts
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration with wallet
- `POST /api/auth/login` - User login with wallet

### Squad Management
- `POST /api/squad/create` - Create new collaborative squad
- `GET /api/squad/:squadId` - Get squad details and members
- `POST /api/squad/:squadId/join` - Join existing squad
- `POST /api/squad/:squadId/distribute-rewards` - Distribute AURA rewards

### AI & Queries
- `POST /api/query` - Process AI queries with context
- `GET /api/ai/squad/:squadId/health` - Squad AI health metrics
- `GET /api/ai/member/:userId/profile` - AI-powered member profiling

### Token Economy
- `GET /api/rewards/pending` - Get pending reward distributions
- `GET /api/rewards/:rewardId` - Get specific reward details
- `GET /api/rewards/conversion-rate` - AURA to USDC conversion rates

### Blockchain Integration
- `GET /api/contracts/network` - Network information
- `GET /api/contracts/balance/:address` - Token balance queries
- `GET /api/contracts/reputation/:address` - Reputation scores

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Commit changes**: `git commit -m 'Add your feature'`
4. **Push to branch**: `git push origin feature/your-feature`
5. **Open a Pull Request**

### Development Guidelines
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure MCP compliance for AI features
- Test smart contract interactions thoroughly

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

### Core Technologies
- **NullShot**: MCP framework and TypeScript Agent Framework
- **Cloudflare**: Workers, KV, and Durable Objects infrastructure
- **OpenAI**: GPT model integration for AI responses
- **Model Context Protocol**: Industry-standard AI agent communication

### Blockchain & Web3
- **ThirdWeb**: Simplified Web3 development platform
- **Base**: High-performance Ethereum Layer 2
- **OpenZeppelin**: Secure smart contract libraries
- **MetaMask**: Leading Web3 wallet solution

### Development Tools
- **Hono.js**: Fast web framework for edge computing
- **Vitest**: Modern testing framework
- **ESLint & Prettier**: Code quality tools
- **Wrangler**: Cloudflare development CLI

## 🔗 Links

- **🌐 Live Demo**: https://aura-ai.keziengotho18.workers.dev
- **📦 GitHub Repository**: https://github.com/KezzyNgotho/Aura-ai
- **📚 Documentation**: [AURA_AI_DOCS.md](AURA_AI_DOCS.md)
- **🔗 MCP Protocol**: https://modelcontextprotocol.io
- **🚀 NullShot Framework**: https://nullshot.ai
- **⚡ Cloudflare Workers**: https://workers.cloudflare.com
- **⛓️ Base Chain**: https://base.org
- **🎨 ThirdWeb**: https://thirdweb.com

---

## 🏗️ Architecture Overview

### MCP Server Implementation
This project uses **NullShot's TypeScript Agent Framework** with the **Model Context Protocol (MCP)** for AI agent communication. The server extends `McpHonoServerDO` to combine MCP functionality with Hono.js routing.

### Key Architectural Components

1. **AuraAiServer**: Main server class extending McpHonoServerDO
2. **Service Layer**: Modular services for auth, squads, tokens, AI
3. **Smart Contracts**: Solidity contracts for token economy
4. **MCP Integration**: Tools, resources, and prompts for AI interaction

### Data Flow
1. User interacts via MetaMask wallet authentication
2. Requests routed through Hono.js on Cloudflare Workers
3. AI queries processed via MCP protocol with OpenAI GPT
4. Squad management handled by intelligent agents
5. Rewards distributed via smart contracts on Base chain

---

**Built with ❤️ using NullShot MCP Framework, Cloudflare Workers, and Ethereum**
- **NullShot MCP Framework**: Advanced MCP implementation with testing utilities
- **OpenAI GPT Integration**: Powered by GPT models for intelligent responses
- **Intelligent Squad Agents**: AI-powered squad optimization and management

### Blockchain & Smart Contracts
- **ThirdWeb**: Simplified Web3 development and deployment
- **Hardhat**: Ethereum development environment for smart contracts
- **Solidity**: Smart contract development language
- **OpenZeppelin**: Battle-tested smart contract libraries
- **Base Chain**: Ethereum Layer 2 for fast transactions

### Frontend & UI
- **Vanilla JavaScript**: No heavy frameworks, fast and lightweight
- **Server-Side Rendering**: HTML templates with embedded JavaScript
- **CSS3**: Modern styling with gradients and animations
- **Font Awesome**: Rich icon library
- **Google Fonts**: Poppins typography

### Development & Testing
- **Vitest**: Fast unit testing framework
- **ESLint & Prettier**: Code quality and formatting
- **Wrangler**: Cloudflare Workers CLI and deployment tool
- **MCP Inspector**: Debug and monitor MCP communications

## 📁 Project Structure

```
├── src/
│   ├── aura-ai-server.ts          # Main server with all features
│   ├── auth-service.ts             # MetaMask wallet authentication
│   ├── squad-service.ts            # Squad creation and management
│   ├── token-service.ts            # AURA token economy
│   ├── ai-service.ts               # OpenAI GPT integration
│   ├── intelligent-squad-agent.ts  # AI squad optimization
│   ├── smart-contract-integration.ts # Blockchain integration
│   ├── edenlayer-integration.ts    # Eden AI layer
│   ├── query-processor-squad.ts    # Squad query processing
│   ├── tools.ts                    # MCP tools
│   ├── resources.ts                # MCP resources
│   ├── prompts.ts                  # MCP prompts
│   └── env.d.ts                    # TypeScript environment types
├── contracts/                      # Solidity smart contracts
│   ├── AuraToken.sol              # AURA token contract
│   ├── RewardsMinter.sol          # Reward distribution
│   ├── TokenConverter.sol         # AURA to USDC conversion
│   └── AgentMarketplace.sol       # AI agent marketplace
├── scripts/                        # Deployment and utility scripts
├── test/                          # Test suites
├── artifacts/                     # Compiled contract artifacts
├── public/                        # Static assets
└── wrangler.jsonc                 # Cloudflare Workers config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm package manager
- MetaMask wallet (for Web3 features)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KezzyNgotho/Aura-ai.git
   cd aura-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set Cloudflare Secrets**
   ```bash
   # Set OpenAI API key as secret
   npx wrangler secret put GPT_API_KEY
   # Enter your OpenAI API key when prompted
   ```

### Development

```bash
# Start development server with MCP Inspector
pnpm run dev

# Start only the worker
pnpm start

# Run tests
pnpm test

# Generate Cloudflare types
pnpm run cf-typegen
```

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm run deploy
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# ThirdWeb Configuration
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key

# Private Key for Contract Deployment
# Format: 0x + exactly 64 hex characters
PRIVATE_KEY=0x_your_private_key_here
```

### Cloudflare Secrets

Set these using Wrangler CLI:
```bash
npx wrangler secret put GPT_API_KEY
npx wrangler secret put THIRDWEB_SECRET_KEY
```

## 🎯 Key Components

### Squad Management
- Create collaborative squads with shared objectives
- Invite members and manage permissions
- AI-powered squad optimization suggestions
- Real-time activity tracking

### Token Economy
- Earn AURA tokens through engagement
- Multiple reward distribution algorithms
- Convert AURA to USDC on Base chain
- Smart contract-based reward minting

### AI Integration
- OpenAI GPT-powered responses
- Intelligent squad agent recommendations
- Query processing with context awareness
- Transparent reasoning display

### Blockchain Features
- MetaMask wallet integration
- Smart contract deployment on Base
- Token minting and distribution
- On-chain reward verification

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Integration testing with MCP
pnpm run test:integration
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Squad Management
- `POST /api/squad/create` - Create new squad
- `GET /api/squad/:squadId` - Get squad details
- `POST /api/squad/:squadId/distribute-rewards` - Distribute rewards

### AI & Queries
- `POST /api/query` - Process AI queries
- `GET /api/ai/squad/:squadId/health` - Squad AI health check

### Token Economy
- `GET /api/rewards/pending` - Get pending rewards
- `GET /api/rewards/conversion-rate` - Token conversion rates

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure MCP compliance for AI features

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- **NullShot**: MCP framework and infrastructure
- **Cloudflare**: Workers and edge computing platform
- **OpenAI**: GPT model integration
- **ThirdWeb**: Web3 development tools
- **Base**: Ethereum Layer 2 network
- **OpenZeppelin**: Smart contract libraries

## 🔗 Links

- **Live Demo**: https://aura-ai.keziengotho18.workers.dev
- **GitHub**: https://github.com/KezzyNgotho/Aura-ai
- **Documentation**: See [AURA_AI_DOCS.md](AURA_AI_DOCS.md) for detailed documentation
- **MCP Protocol**: https://modelcontextprotocol.io
- **NullShot Framework**: https://nullshot.ai

---

**Built with ❤️ on Cloudflare Workers & Ethereum**

## Usage Overview

There are two ways to leverage run an MCP Server with and without Hono for request routing.

### Environment Setup

Optionally you can create a `.dev.vars` which will will bootstrap local [enviornment variables](https://nullshot.ai/en/docs/developers/platform/environment-variables) or [secrets](https://nullshot.ai/en/docs/developers/platform/secret-manager).

When you run `pnpm cf-typegen` it generates `worker-configuration.d.ts` which creates an `Env` class for your code to access cloudflare bindings, env vars, and more.

### McpHonoServerDO Implementation

By default, the template uses `McpHonoServerDO` which combines the MCP server with [Hono](https://hono.dev), a fast and lightweight web framework. This provides a clean routing system and middleware capabilities.

### Customizing Routes with Hono

To add custom HTTP endpoints with `McpHonoServerDO`, extend the `setupRoutes` method:

```typescript
export class ExampleMcpServer extends McpHonoServerDO<Env> {
  // Other methods...

  protected setupRoutes(app: Hono<{ Bindings: Env }>): void {
    // Call the parent implementation to set up MCP routes
    super.setupRoutes(app);
    
    // Add your custom routes
    app.get('/api/status', (c) => {
      return c.json({ status: 'ok' });
    });
    
    app.post('/api/data', async (c) => {
      const body = await c.req.json();
      // Process data
      return c.json({ success: true });
    });
  }
}
```

### McpServerDO Implementation (Native Cloudflare Routing)

If you need more control over the HTTP request handling, you can directly extend `McpServerDO` instead. This gives you full control over the `fetch` method:

```typescript
export class CustomMcpServer extends McpServerDO<Env> {
  // Required abstract method implementations
  getImplementation(): Implementation {
    return {
      name: 'CustomMcpServer',
      version: '1.0.0',
    };
  }
  
  configureServer(server: McpServer): void {
    setupServerTools(server);
    setupServerResources(server);
    setupServerPrompts(server);
  }
  
  // Override the fetch method for complete control over routing
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle custom routes
    if (path === '/api/custom') {
      return new Response(JSON.stringify({ custom: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Pass through MCP-related requests to the parent implementation
    return super.fetch(request);
  }
}
```

This approach is useful when you need to:
- Handle specific routes with custom logic
- Implement complex middleware or authentication
- Intercept or modify requests before they reach the MCP handler
- Add custom WebSocket or SSE endpoints beyond the standard MCP implementation

### Creating Tools, Resources, and Prompts

The main server implementation is in `src/server.ts` and extends `McpHonoServerDO`:

```typescript
export class ExampleMcpServer extends McpHonoServerDO<Env> {
  // Required abstract method implementation
  getImplementation(): Implementation {
    return {
      name: 'ExampleMcpServer',
      version: '1.0.0',
    };
  }

  // Configure server by adding tools, resources, and prompts
  configureServer(server: McpServer): void {
    setupServerTools(server);
    setupServerResources(server);
    setupServerPrompts(server);
  }
}
```

To add functionality, use the following modules:

1. **Tools** (`src/tools.ts`): Define functions that clients can call

```typescript
export function setupServerTools(server: McpServer) {
  server.tool(
    'tool_name',           // Name of the tool
    'Tool description',    // Description
    {                      // Parameters schema using zod
      param1: z.string().describe('Parameter description'),
    },       
    async ({ param1 }) => {
      // Tool implementation
      return {
        content: [
          {
            type: "text",
            text: `Result: ${param1}`
          }
        ]
      };
    }
  );
}
```

2. **Resources** (`src/resources.ts`): Define persistent resources clients can access

```typescript
export function setupServerResources(server: McpServer) {
  server.resource(
    'resource_name',
    'resource://path/{id}',
    async (uri: URL) => {
      // Resource implementation
      return {
        contents: [
          {
            text: `Resource data`,
            uri: uri.href
          }
        ]
      };
    }
  );
}
```

3. **Prompts** (`src/prompts.ts`): Define prompt templates

```typescript
export function setupServerPrompts(server: McpServer) {
  server.prompt(
    'prompt_name',
    'Prompt description',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `Your prompt text here`
        }
      }]
    })
  );
}
```

### Examples

* [CRUD MCP Example](https://github.com/null-shot/typescript-agent-framework/tree/main/examples/crud-mcp) - Leverage D1 Database
* [Expense MCP Example](https://github.com/null-shot/typescript-agent-framework/tree/main/examples/expense-mcp) - Leveraging Workflows
* [Dependent Agent](https://github.com/null-shot/typescript-agent-framework/tree/main/examples/dependent-agent) - AI Agent with MCP dependencies

## Related Resources

### Core Packages

- [MCP Package](https://github.com/xava-labs/typescript-agent-framework/tree/main/packages/mcp): The core MCP implementation with advanced features and testing utilities
- [TypeScript Agent Framework](https://github.com/xava-labs/typescript-agent-framework): Build intelligent agents powered by LLMs with the Agent Framework

### Docs

- [Overview](https://nullshot.ai/en/docs/developers/mcp-framework/overview)
- [Getting Started Guide](https://nullshot.ai/en/docs/developers/mcp-framework/getting-started)
- [Integration Testing](https://nullshot.ai/en/docs/developers/mcp-framework/integration-testing)

### Community

Join our community to get help, share ideas, and contribute to the project:

- [Discord](https://discord.gg/acwpp6zWEc): Join the `#typescript-framework` channel for feature requests, support, and discussions

### Contributing

We welcome contributions to improve this template! Here's how you can contribute:

1. **Fork the repository**: Create a fork to make your changes

2. **Create a branch**: Make your changes in a new branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit your changes**: Make meaningful commits
   ```bash
   git commit -m "Add feature: brief description"
   ```

4. **Push to your fork**: Push your changes to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a pull request**: Open a PR with a detailed description of your changes

### Pull Request Guidelines

- Provide a clear, descriptive title for your PR
- Include a detailed description of what your PR does
- Reference any related issues
- Include screenshots or examples if applicable
- Ensure all tests pass
- Keep PRs focused on a single feature or fix

For larger changes or features, we recommend discussing them first in our Discord channel to ensure alignment with the project direction.

Or use the Deploy to Cloudflare button above to deploy directly from GitHub.

## License

[MIT](LICENSE)
