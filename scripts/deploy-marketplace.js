const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(`${title}`, colors.cyan + colors.bright);
  console.log("=".repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function updateEnvFile(contractAddress, network) {
  // Determine the environment variable name based on network
  const envVarName = network === "mainnet" 
    ? "NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_MAINNET"
    : "NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET";
  
  const newLine = `${envVarName}=${contractAddress}`;
  const regex = new RegExp(`^${envVarName}=.*$`, "m");
  
  // Update .env file
  try {
    const envPath = path.join(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
        fs.writeFileSync(envPath, envContent);
        logInfo(`Updated existing ${envVarName} in .env`);
      } else {
        envContent += envContent.endsWith("\n") ? "" : "\n";
        envContent += `${newLine}\n`;
        fs.writeFileSync(envPath, envContent);
        logInfo(`Added new ${envVarName} to .env`);
      }
    }
  } catch (error) {
    logError(`Failed to update .env: ${error.message}`);
  }
  
  // Update .env.local file
  try {
    const envLocalPath = path.join(__dirname, "../.env.local");
    let envLocalContent = "";
    
    if (fs.existsSync(envLocalPath)) {
      envLocalContent = fs.readFileSync(envLocalPath, "utf8");
    }
    
    if (regex.test(envLocalContent)) {
      envLocalContent = envLocalContent.replace(regex, newLine);
      logInfo(`Updated existing ${envVarName} in .env.local`);
    } else {
      envLocalContent += envLocalContent.length > 0 && !envLocalContent.endsWith("\n") ? "\n" : "";
      envLocalContent += `${newLine}\n`;
      logInfo(`Added new ${envVarName} to .env.local`);
    }
    
    fs.writeFileSync(envLocalPath, envLocalContent);
    logSuccess(`Environment variables updated in both .env and .env.local`);
    
  } catch (error) {
    logError(`Failed to update .env.local: ${error.message}`);
  }
}

async function saveDeploymentInfo(contractAddress, deployerAddress, networkName, txHash, permalinkAddress, treasuryAddress) {
  const deploymentInfo = {
    marketplace: {
      address: contractAddress,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      network: networkName,
      deploymentTxHash: txHash,
      permalinkContract: permalinkAddress,
      platformTreasury: treasuryAddress,
      contractName: "PermalinkMarketplace"
    }
  };

  try {
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filePath = path.join(deploymentsDir, `${networkName}-marketplace.json`);
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    logSuccess(`Deployment info saved to deployments/${networkName}-marketplace.json`);
  } catch (error) {
    logError(`Failed to save deployment info: ${error.message}`);
  }
}

async function main() {
  try {
    logSection("PERMALINK MARKETPLACE DEPLOYMENT");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    
    logInfo(`Network: ${networkName} (Chain ID: ${network.chainId})`);

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    logInfo(`Deployer: ${deployerAddress}`);
    logInfo(`Balance: ${ethers.formatEther(balance)} ETH`);

    // Check minimum balance
    const minBalance = ethers.parseEther("0.01");
    if (balance < minBalance) {
      logError("Insufficient balance for deployment");
      process.exit(1);
    }

    // Get existing Permalink contract address
    const permalinkAddress = process.env.PERMALINK_CONTRACT_ADDRESS || 
                           process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET ||
                           process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_MAINNET;
    
    if (!permalinkAddress) {
      logError("Permalink contract address not found in environment variables");
      logError("Please set PERMALINK_CONTRACT_ADDRESS or deploy the main contract first");
      process.exit(1);
    }
    
    // Platform treasury address (can be the same as deployer for now)
    const platformTreasury = process.env.PLATFORM_TREASURY_ADDRESS || 
                           process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS || 
                           deployerAddress;
    
    logInfo(`Permalink Contract: ${permalinkAddress}`);
    logInfo(`Platform Treasury: ${platformTreasury}`);

    logSection("DEPLOYING MARKETPLACE CONTRACT");

    // Deploy PermalinkMarketplace
    logInfo("Deploying PermalinkMarketplace contract...");
    const PermalinkMarketplace = await ethers.getContractFactory("PermalinkMarketplace");
    const marketplace = await PermalinkMarketplace.deploy(
      permalinkAddress,      // _permalinkNFT
      permalinkAddress,      // _permalinkContract (same address)
      platformTreasury,      // _platformTreasury
      deployerAddress        // initialOwner
    );

    // Wait for deployment
    logInfo("Waiting for deployment transaction to be mined...");
    await marketplace.waitForDeployment();
    
    const marketplaceAddress = await marketplace.getAddress();
    const deploymentTx = marketplace.deploymentTransaction();

    logSuccess("PermalinkMarketplace deployed successfully!");
    logInfo(`Contract Address: ${marketplaceAddress}`);
    logInfo(`Transaction Hash: ${deploymentTx.hash}`);
    logInfo(`Gas Used: ${deploymentTx.gasLimit?.toString() || "N/A"}`);

    logSection("POST-DEPLOYMENT SETUP");

    // Update environment variables
    await updateEnvFile(marketplaceAddress, networkName);

    // Save deployment info
    await saveDeploymentInfo(
      marketplaceAddress,
      deployerAddress,
      networkName,
      deploymentTx.hash,
      permalinkAddress,
      platformTreasury
    );

    logSection("MARKETPLACE CONFIGURATION");

    // Verify marketplace settings
    const marketplaceFee = await marketplace.marketplaceFee();
    const owner = await marketplace.owner();
    const treasury = await marketplace.platformTreasury();
    
    logInfo(`Marketplace Fee: ${Number(marketplaceFee) / 100}% (${marketplaceFee} basis points)`);
    logInfo(`Owner: ${owner}`);
    logInfo(`Platform Treasury: ${treasury}`);

    // Test marketplace connection to main contract
    logSection("TESTING CONTRACT CONNECTION");
    
    try {
      const permalinkContract = await ethers.getContractAt("Permalink", permalinkAddress);
      
      // Test if main contract supports ERC-2981
      const supportsERC2981 = await permalinkContract.supportsInterface("0x2a55205a");
      logInfo(`Main contract supports ERC-2981: ${supportsERC2981}`);
      
      if (supportsERC2981) {
        logSuccess("Royalty support confirmed - marketplace ready!");
        
        // Test fee structure
        try {
          const testTokenId = 1; // Assuming token 1 exists for testing
          const testSalePrice = ethers.parseEther("1.0");
          const feeInfo = await permalinkContract.getSecondaryFees(testTokenId, testSalePrice);
          
          logInfo("Secondary market fee structure:");
          logInfo(`- Artist Royalty: ${ethers.formatEther(feeInfo.artistRoyalty)} ETH (${Number(feeInfo.artistRoyalty) * 100 / Number(testSalePrice)}%)`);
          logInfo(`- Platform Fee: ${ethers.formatEther(feeInfo.platformFee)} ETH (${Number(feeInfo.platformFee) * 100 / Number(testSalePrice)}%)`);
          logInfo(`- Total Fees: ${ethers.formatEther(feeInfo.totalFees)} ETH (${Number(feeInfo.totalFees) * 100 / Number(testSalePrice)}%)`);
        } catch (error) {
          logWarning("Could not test fee structure (no tokens may exist yet)");
        }
      } else {
        logWarning("Main contract doesn't support ERC-2981 royalties");
        logWarning("Consider upgrading the main contract for full marketplace functionality");
      }
    } catch (error) {
      logError(`Could not verify contract connection: ${error.message}`);
    }

    logSection("FRONTEND INTEGRATION");

    logInfo("Frontend integration complete:");
    logInfo(`1. Marketplace address automatically added to .env files`);
    logInfo(`2. Import marketplace ABI from: artifacts/contracts/PermalinkMarketplace.sol/PermalinkMarketplace.json`);
    logInfo(`3. Marketplace contract address: ${marketplaceAddress}`);

    logSection("USER INSTRUCTIONS");

    logInfo("For users to trade NFTs, they need to:");
    logInfo(`1. Approve the marketplace: permalinkContract.setApprovalForAll("${marketplaceAddress}", true)`);
    logInfo(`2. This can be done through the frontend UI when creating their first listing`);

    if (networkName === "localhost" || networkName === "hardhat") {
      logWarning("This is a local deployment. Make sure to deploy to testnet/mainnet for production!");
    }

    logSection("DEPLOYMENT COMPLETE");
    logSuccess("Permalink Marketplace deployed and configured successfully! 🎉");

    // Return deployment info for potential use by other scripts
    return {
      marketplaceAddress,
      deployerAddress,
      networkName,
      txHash: deploymentTx.hash,
      permalinkAddress,
      platformTreasury
    };

  } catch (error) {
    logError(`Marketplace deployment failed: ${error.message}`);
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