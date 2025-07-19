const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Fixed Permalink Contract with Treasury Support\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "XTZ\n");

  // Treasury address (same as deployer for now, but can be changed later)
  const treasuryAddress = process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasuryAddress);
  
  if (treasuryAddress === deployer.address) {
    console.log("⚠️  Using deployer address as treasury (can be changed later)\n");
  } else {
    console.log("✅ Using configured treasury address\n");
  }

  // Deploy the fixed contract
  console.log("📦 Deploying Permalink contract...");
  const Permalink = await ethers.getContractFactory("Permalink");
  const permalink = await Permalink.deploy(deployer.address, treasuryAddress);
  await permalink.waitForDeployment();
  
  const contractAddress = await permalink.getAddress();
  console.log("✅ Permalink deployed to:", contractAddress);

  // Wait for a few block confirmations
  console.log("⏳ Waiting for confirmations...");
  await permalink.deploymentTransaction().wait(5);

  // Verify contract configuration
  console.log("\n🔍 Verifying contract configuration:");
  const owner = await permalink.owner();
  const treasury = await permalink.treasuryAddress();
  const platformFee = await permalink.platformFeePercentage();
  
  console.log("Owner:", owner);
  console.log("Treasury:", treasury);
  console.log("Platform Fee:", Number(platformFee) / 100 + "%");

  // Update environment files
  updateEnvFile('.env', 'NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET', contractAddress);
  updateEnvFile('.env.local', 'NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET', contractAddress);

  console.log("\n🎉 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Contract Address:", contractAddress);
  console.log("Treasury Address:", treasury);
  console.log("Network: Etherlink Testnet");
  console.log("Transaction:", permalink.deploymentTransaction().hash);
  
  console.log("\n✅ FIXES APPLIED:");
  console.log("1. ✅ Removed 10% 'artist royalty' from primary sales");
  console.log("2. ✅ Platform fees now go directly to treasury");
  console.log("3. ✅ Artist now receives 97.5% (not 87.5%) in primary sales");
  console.log("4. ✅ Added treasury address configuration");
  console.log("5. ✅ Added function to withdraw any accumulated fees");
  
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Run: npx hardhat run scripts/withdraw-old-fees.js --network etherlinkTestnet");
  console.log("2. Update marketplace contract to use new main contract");
  console.log("3. Test the new fee distribution");

  // Verify on block explorer (optional)
  try {
    console.log("\n🔍 Verifying contract on block explorer...");
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [deployer.address, treasuryAddress],
    });
    console.log("✅ Contract verified on block explorer");
  } catch (error) {
    console.log("⚠️  Verification failed (this is normal on testnet):", error.message);
  }
}

function updateEnvFile(envFile, key, value) {
  const envPath = path.resolve(envFile);
  
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️  ${envFile} not found, skipping...`);
    return;
  }
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    if (keyRegex.test(envContent)) {
      envContent = envContent.replace(keyRegex, `${key}=${value}`);
      console.log(`✅ Updated ${key} in ${envFile}`);
    } else {
      envContent += `\n${key}=${value}`;
      console.log(`✅ Added ${key} to ${envFile}`);
    }
    
    fs.writeFileSync(envPath, envContent);
  } catch (error) {
    console.log(`⚠️  Error updating ${envFile}:`, error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 