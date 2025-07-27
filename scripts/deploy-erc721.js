const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Permalink ERC-721 contracts to Etherlink...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Configuration
  const treasuryAddress = deployer.address; // Using deployer as treasury for now
  console.log("🏛️  Treasury address:", treasuryAddress);

  try {
    // Deploy Permalink ERC-721 contract
    console.log("\n📦 Deploying Permalink ERC-721 contract...");
    const Permalink = await hre.ethers.getContractFactory("contracts/PermalinkERC721.sol:Permalink");
    const permalink = await Permalink.deploy(deployer.address, treasuryAddress);
    await permalink.waitForDeployment();
    
    const permalinkAddress = await permalink.getAddress();
    console.log("✅ Permalink ERC-721 deployed to:", permalinkAddress);
    
    // Deploy Marketplace contract
    console.log("\n📦 Deploying Marketplace contract...");
    const Marketplace = await hre.ethers.getContractFactory("contracts/PermalinkMarketplaceERC721.sol:PermalinkMarketplace");
    const marketplace = await Marketplace.deploy(
      permalinkAddress,    // ERC-721 contract address
      permalinkAddress,    // Interface contract address (same)
      treasuryAddress,     // Platform treasury
      deployer.address     // Initial owner
    );
    await marketplace.waitForDeployment();
    
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ Marketplace deployed to:", marketplaceAddress);

    // Verify deployment by calling basic functions
    console.log("\n🔍 Verifying deployments...");
    
    try {
      const name = await permalink.name();
      const symbol = await permalink.symbol();
      const currentSeriesId = await permalink.getCurrentSeriesId();
      console.log(`✅ Permalink: ${name} (${symbol}) - Current Series ID: ${currentSeriesId}`);
      
      const marketplaceFee = await marketplace.marketplaceFee();
      console.log(`✅ Marketplace: Fee ${marketplaceFee} basis points`);
      
    } catch (error) {
      console.log("⚠️  Warning: Could not verify contract calls:", error.message);
    }

    // Save deployment addresses
    const deployment = {
      network: hre.network.name,
      permalink: {
        address: permalinkAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString()
      },
      marketplace: {
        address: marketplaceAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString()
      },
      treasury: treasuryAddress
    };

    const fs = require('fs');
    const deploymentFile = `deployments/erc721-${hre.network.name}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log(`📁 Deployment info saved to: ${deploymentFile}`);

    // Display summary
    console.log("\n🎉 Deployment Summary:");
    console.log("═".repeat(50));
    console.log(`Network: ${hre.network.name}`);
    console.log(`Permalink ERC-721: ${permalinkAddress}`);
    console.log(`Marketplace:       ${marketplaceAddress}`);
    console.log(`Treasury:          ${treasuryAddress}`);
    console.log(`Deployer:          ${deployer.address}`);
    console.log("═".repeat(50));
    
    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env file with the new contract addresses:");
    console.log(`   NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS=${permalinkAddress}`);
    console.log(`   NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);
    console.log("2. Update frontend to use ERC-721 functions");
    console.log("3. Test series creation and NFT minting");
    
    console.log("\n✨ ERC-721 deployment completed successfully!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }); 