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
    ? "NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_MAINNET"
    : "NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET";
  
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

async function saveDeploymentInfo(contractAddress, deployerAddress, network, txHash) {
  try {
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentInfo = {
      contractAddress,
      deployerAddress,
      network,
      deploymentTxHash: txHash,
      deploymentTime: new Date().toISOString(),
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      contractName: "Permalink",
      abi: "See artifacts/contracts/Permalink.sol/Permalink.json"
    };
    
    const deploymentPath = path.join(deploymentsDir, `${network}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    logSuccess(`Deployment info saved to deployments/${network}.json`);
  } catch (error) {
    logError(`Failed to save deployment info: ${error.message}`);
  }
}

async function verifyContract(contractAddress, constructorArgs) {
  try {
    logInfo("Waiting 1 minute before contract verification...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    
    logSuccess("Contract verified successfully!");
  } catch (error) {
    logWarning(`Contract verification failed: ${error.message}`);
  }
}

async function main() {
  try {
    logSection("PERMALINK CONTRACT DEPLOYMENT");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    
    logInfo(`Network: ${networkName} (Chain ID: ${network.chainId})`);
    
    // Get deployer info
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
    
    logSection("DEPLOYING CONTRACT");
    
    // Get contract factory
    const PermalinkFactory = await ethers.getContractFactory("Permalink");
    
    // Deploy contract
    logInfo("Deploying Permalink contract...");
    const contract = await PermalinkFactory.deploy(deployerAddress);
    
    // Wait for deployment
    logInfo("Waiting for deployment transaction to be mined...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();
    
    logSuccess(`Contract deployed successfully!`);
    logInfo(`Contract Address: ${contractAddress}`);
    logInfo(`Transaction Hash: ${deploymentTx.hash}`);
    logInfo(`Gas Used: ${deploymentTx.gasLimit?.toString() || "N/A"}`);
    
    logSection("POST-DEPLOYMENT SETUP");
    
    // Update environment variables
    await updateEnvFile(contractAddress, networkName);
    
    // Save deployment info
    await saveDeploymentInfo(
      contractAddress, 
      deployerAddress, 
      networkName, 
      deploymentTx.hash
    );
    
    // Verify contract (skip for localhost)
    if (networkName !== "localhost" && networkName !== "hardhat") {
      logInfo("Attempting contract verification...");
      await verifyContract(contractAddress, [deployerAddress]);
    }
    
    logSection("CONTRACT INFORMATION");
    
    // Display contract details
    const name = await contract.name();
    const symbol = await contract.symbol();
    const owner = await contract.owner();
    const platformFee = await contract.platformFeePercentage();
    
    logInfo(`Contract Name: ${name}`);
    logInfo(`Symbol: ${symbol}`);
    logInfo(`Owner: ${owner}`);
    logInfo(`Platform Fee: ${Number(platformFee) / 100}%`);
    
    logSection("FRONTEND INTEGRATION");
    
    logInfo("To integrate with your frontend:");
    logInfo(`1. The contract address has been automatically added to .env.local`);
    logInfo(`2. Import the contract ABI from: artifacts/contracts/Permalink.sol/Permalink.json`);
    logInfo(`3. Use the contract address: ${contractAddress}`);
    
    if (networkName === "localhost" || networkName === "hardhat") {
      logWarning("This is a local deployment. Make sure to deploy to testnet/mainnet for production!");
    }
    
    logSection("DEPLOYMENT COMPLETE");
    logSuccess("Permalink contract deployed and configured successfully! 🎉");
    
    // Return deployment info for potential use by other scripts
    return {
      contractAddress,
      deployerAddress,
      networkName,
      txHash: deploymentTx.hash
    };
    
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  main()
    .then((result) => {
      if (result) {
        logSuccess(`Deployment completed: ${result.contractAddress}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      logError(`Script failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = main; 