const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying AURA AI Smart Contracts with Hardhat...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log(`📍 Network: ${network}`);
  console.log(`👤 Deployer: ${deployer.address}\n`);

  // Get balance
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.isZero()) {
    console.error("❌ Error: Deployer account has no balance!");
    console.error("Please fund the account with gas tokens before deploying.");
    process.exit(1);
  }

  const deployedAddresses = {};

  try {
    // 1. Deploy AuraToken
    console.log("📝 Deploying AuraToken...");
    const AuraToken = await hre.ethers.getContractFactory("AuraToken");
    const auraToken = await AuraToken.deploy();
    await auraToken.deployed();
    console.log(`✅ AuraToken deployed to: ${auraToken.address}\n`);
    deployedAddresses.AuraToken = auraToken.address;

    // 2. Deploy RewardsMinter
    console.log("📝 Deploying RewardsMinter...");
    
    // Get USDC address for this network
    const usdcAddresses = {
      "arbitrum-sepolia": "0x0000000000000000000000000000000000000000", // No USDC testnet
      "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
      base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      optimism: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      arbitrum: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F86",
      polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    };

    const usdcAddress = usdcAddresses[network] || "0x0000000000000000000000000000000000000000";
    
    if (usdcAddress === "0x0000000000000000000000000000000000000000") {
      console.log(`⚠️  Warning: No USDC token configured for ${network}`);
      console.log("    RewardsMinter will be deployed but USDC functionality requires configuration\n");
    }

    const RewardsMinter = await hre.ethers.getContractFactory("RewardsMinter");
    const rewardsMinter = await RewardsMinter.deploy(auraToken.address, usdcAddress);
    await rewardsMinter.deployed();
    console.log(`✅ RewardsMinter deployed to: ${rewardsMinter.address}\n`);
    deployedAddresses.RewardsMinter = rewardsMinter.address;

    // 3. Deploy TokenConverter
    console.log("📝 Deploying TokenConverter...");
    const TokenConverter = await hre.ethers.getContractFactory("TokenConverter");
    const tokenConverter = await TokenConverter.deploy(auraToken.address, usdcAddress);
    await tokenConverter.deployed();
    console.log(`✅ TokenConverter deployed to: ${tokenConverter.address}\n`);
    deployedAddresses.TokenConverter = tokenConverter.address;

    // 4. Deploy AgentMarketplace
    console.log("📝 Deploying AgentMarketplace...");
    const AgentMarketplace = await hre.ethers.getContractFactory("AgentMarketplace");
    const agentMarketplace = await AgentMarketplace.deploy(auraToken.address);
    await agentMarketplace.deployed();
    console.log(`✅ AgentMarketplace deployed to: ${agentMarketplace.address}\n`);
    deployedAddresses.AgentMarketplace = agentMarketplace.address;

    // Post-deployment setup
    console.log("⚙️  Setting up contract permissions...\n");

    // Add RewardsMinter as authorized minter
    console.log("📝 Adding RewardsMinter as authorized minter...");
    await auraToken.addMinter(rewardsMinter.address);
    console.log("✅ RewardsMinter authorized\n");

    // Save deployment addresses
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentsFile = path.join(deploymentsDir, `${network}.json`);
    const deploymentData = {
      network,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      addresses: deployedAddresses,
    };

    fs.writeFileSync(deploymentsFile, JSON.stringify(deploymentData, null, 2));
    console.log(`📁 Deployments saved to: ${deploymentsFile}\n`);

    // Display summary
    console.log("═".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("═".repeat(60));
    console.log("\n📋 Contract Addresses:\n");
    console.log(`AuraToken:       ${deployedAddresses.AuraToken}`);
    console.log(`RewardsMinter:   ${deployedAddresses.RewardsMinter}`);
    console.log(`TokenConverter:  ${deployedAddresses.TokenConverter}`);
    console.log(`AgentMarketplace:${deployedAddresses.AgentMarketplace}`);
    
    console.log("\n📝 Next Steps:\n");
    console.log("1. Add these addresses to your .env file:");
    console.log(`   AURA_TOKEN_ADDRESS=${deployedAddresses.AuraToken}`);
    console.log(`   REWARDS_MINTER_ADDRESS=${deployedAddresses.RewardsMinter}`);
    console.log(`   TOKEN_CONVERTER_ADDRESS=${deployedAddresses.TokenConverter}`);
    console.log(`   AGENT_MARKETPLACE_ADDRESS=${deployedAddresses.AgentMarketplace}`);
    
    console.log("\n2. Verify contracts on block explorer:");
    const explorers = {
      "arbitrum-sepolia": "https://sepolia.arbiscan.io",
      "base-sepolia": "https://sepolia.basescan.org",
      base: "https://basescan.org",
      optimism: "https://optimistic.etherscan.io",
      arbitrum: "https://arbiscan.io",
      polygon: "https://polygonscan.com",
    };
    const explorerUrl = explorers[network];
    if (explorerUrl) {
      console.log(`   ${explorerUrl}/address/${deployedAddresses.AuraToken}`);
    }
    
    console.log("\n3. Update frontend with new contract addresses");
    console.log("\n═".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
