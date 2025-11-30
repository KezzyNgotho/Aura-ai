import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Script to extract contract ABIs for frontend integration
 * This generates TypeScript files with contract ABIs that can be used
 * in the frontend for Web3 interactions
 */

interface ContractInfo {
  name: string;
  path: string;
  description: string;
}

const contracts: ContractInfo[] = [
  {
    name: "AuraToken",
    path: "contracts/AuraToken.sol",
    description: "ERC20 token with minting control",
  },
  {
    name: "RewardsMinter",
    path: "contracts/RewardsMinter.sol",
    description: "Rewards distribution contract",
  },
  {
    name: "TokenConverter",
    path: "contracts/TokenConverter.sol",
    description: "Token conversion contract",
  },
  {
    name: "AgentMarketplace",
    path: "contracts/AgentMarketplace.sol",
    description: "Insight marketplace contract",
  },
];

// Extract interfaces and function signatures from Solidity files
function extractFunctions(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const functions: string[] = [];

  // Match function declarations (public/external)
  const functionRegex =
    /^\s*(public|external)\s+\w+\s+(\w+)\s*\((.*?)\)(?:\s+\w+)*/gm;
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[2];
    const params = match[3];
    functions.push(`${functionName}(${params})`);
  }

  return functions;
}

// Generate contract interface TypeScript file
function generateContractInterface(contract: ContractInfo): string {
  const functions = extractFunctions(contract.path);

  const functionSignatures = functions.map((func) => `  "${func}"`).join(",\n");

  return `/**
 * ${contract.name} Contract Interface
 * Auto-generated from ${contract.path}
 * ${contract.description}
 */

export const ${contract.name}ABI = [
${functionSignatures}
] as const;

export interface ${contract.name}Contract {
  address: string;
  abi: typeof ${contract.name}ABI;
}

export const ${contract.name}Functions = {
${functions
  .map((func) => {
    const name = func.split("(")[0];
    return `  ${name}: "${func}",`;
  })
  .join("\n")}
} as const;
`;
}

// Generate deployment addresses TypeScript file
function generateDeploymentAddresses(): string {
  return `/**
 * Contract Deployment Addresses
 * Update these addresses after deploying contracts
 * Format: { [chainName]: { [contractName]: address } }
 */

export const DEPLOYED_CONTRACTS = {
  "arbitrum-sepolia": {
    AuraToken: "0x", // TODO: Add address after deployment
    RewardsMinter: "0x",
    TokenConverter: "0x",
    AgentMarketplace: "0x",
  },
  base: {
    AuraToken: "0x",
    RewardsMinter: "0x",
    TokenConverter: "0x",
    AgentMarketplace: "0x",
  },
  optimism: {
    AuraToken: "0x",
    RewardsMinter: "0x",
    TokenConverter: "0x",
    AgentMarketplace: "0x",
  },
  arbitrum: {
    AuraToken: "0x",
    RewardsMinter: "0x",
    TokenConverter: "0x",
    AgentMarketplace: "0x",
  },
  polygon: {
    AuraToken: "0x",
    RewardsMinter: "0x",
    TokenConverter: "0x",
    AgentMarketplace: "0x",
  },
} as const;

export type ChainName = keyof typeof DEPLOYED_CONTRACTS;
export type ContractName = keyof typeof DEPLOYED_CONTRACTS["arbitrum-sepolia"];

export function getContractAddress(
  chain: ChainName,
  contract: ContractName
): string {
  const address = DEPLOYED_CONTRACTS[chain][contract];
  if (!address || address === "0x") {
    throw new Error(\`Contract \${contract} not deployed on \${chain}\`);
  }
  return address;
}

export function isContractDeployed(chain: ChainName, contract: ContractName): boolean {
  const address = DEPLOYED_CONTRACTS[chain][contract];
  return address !== undefined && address !== "0x";
}
`;
}

// Generate main contract index file
function generateContractIndex(): string {
  const imports = contracts
    .map((c) => `import { ${c.name}ABI, ${c.name}Functions } from "./${c.name}.abi";`)
    .join("\n");

  const exports = contracts
    .map((c) => `export { ${c.name}ABI, ${c.name}Functions };`)
    .join("\n");

  return `/**
 * Contract ABIs and Interfaces
 * Auto-generated for frontend Web3 integration
 */

${imports}
import {
  DEPLOYED_CONTRACTS,
  getContractAddress,
  isContractDeployed,
  type ChainName,
  type ContractName,
} from "./deployments.abi";

${exports}
export { DEPLOYED_CONTRACTS, getContractAddress, isContractDeployed };
export type { ChainName, ContractName };

/**
 * All available contract ABIs
 */
export const ALL_CONTRACTS = {
${contracts.map((c) => `  ${c.name}: ${c.name}ABI,`).join("\n")}
} as const;

/**
 * All available contract functions
 */
export const ALL_FUNCTIONS = {
${contracts.map((c) => `  ${c.name}: ${c.name}Functions,`).join("\n")}
} as const;
`;
}

// Main execution
function main() {
  console.log("📦 Extracting Contract ABIs...\n");

  const abiDir = "src/contracts";

  // Create directory if it doesn't exist
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
    console.log(`✓ Created directory: ${abiDir}`);
  }

  // Generate ABI files for each contract
  for (const contract of contracts) {
    const interface = generateContractInterface(contract);
    const filePath = path.join(abiDir, `${contract.name}.abi.ts`);

    fs.writeFileSync(filePath, interface);
    console.log(`✓ Generated: ${filePath}`);
  }

  // Generate deployment addresses file
  const deploymentsPath = path.join(abiDir, "deployments.abi.ts");
  fs.writeFileSync(deploymentsPath, generateDeploymentAddresses());
  console.log(`✓ Generated: ${deploymentsPath}`);

  // Generate index file
  const indexPath = path.join(abiDir, "index.ts");
  fs.writeFileSync(indexPath, generateContractIndex());
  console.log(`✓ Generated: ${indexPath}`);

  console.log(`\n✅ Contract ABIs extracted successfully!`);
  console.log(`\n📝 Next steps:`);
  console.log(`1. Deploy contracts using: npm run deploy:contracts`);
  console.log(`2. Update contract addresses in: ${deploymentsPath}`);
  console.log(`3. Use contracts in frontend: import { AuraTokenABI } from '@/contracts'`);
}

main();
