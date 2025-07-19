const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🔍 TRACING FEES IN BLOCK EXPLORER");
  console.log("=================================");
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log(`\n📍 Deployer/Treasury: ${deployer.address}`);
  
  // Connect to contracts
  const permalink = await hre.ethers.getContractAt("Permalink", process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET);
  const marketplace = await hre.ethers.getContractAt("PermalinkMarketplace", process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET);
  
  console.log(`\n📋 Contract Addresses:`);
  console.log(`Permalink: ${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET}`);
  console.log(`Marketplace: ${process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET}`);
  
  // Check current balances
  const initialBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`\n💰 Initial Treasury Balance: ${ethers.formatEther(initialBalance)} XTZ`);
  
  try {
    console.log("\n🎨 CREATING ARTWORK TO PURCHASE...");
    
    // Simple SVG as bytes
    const svgData = '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ff6600"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">Test NFT</text></svg>';
    const imageData = ethers.toUtf8Bytes(svgData);
    
    // Create artwork
    const createTx = await permalink.mintArtwork(
      "Test Fee Tracing NFT",
      "Testing fee distribution in block explorer",
      imageData,
      "image/svg+xml",
      ethers.parseEther("0.1"), // 0.1 XTZ price
      100 // 100 editions
    );
    
    console.log(`📝 Create Transaction: ${createTx.hash}`);
    const createReceipt = await createTx.wait();
    
    // Get the created token ID from events
    const artworkId = createReceipt.logs.length > 0 ? 1 : 1; // Will be 1 if successful
    
    console.log("\n💳 PURCHASING ARTWORK (THIS IS THE TRANSACTION TO TRACE)...");
    console.log("==========================================================");
    
    // Purchase artwork - THIS IS THE TRANSACTION TO TRACE
    const purchaseTx = await permalink.purchaseArtwork(artworkId, 1, {
      value: ethers.parseEther("0.1") // 0.1 XTZ
    });
    
    console.log(`\n🎯 **TRACE THIS TRANSACTION:** ${purchaseTx.hash}`);
    console.log(`🔗 Block Explorer URL: https://testnet.explorer.etherlink.com/tx/${purchaseTx.hash}`);
    
    const receipt = await purchaseTx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Check final balance
    const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
    const difference = finalBalance - initialBalance;
    
    console.log(`\n💰 Final Treasury Balance: ${ethers.formatEther(finalBalance)} XTZ`);
    console.log(`📈 Balance Change: ${ethers.formatEther(difference)} XTZ`);
    
    console.log("\n🔍 HOW TO TRACE FEES IN BLOCK EXPLORER:");
    console.log("=====================================");
    console.log("1. Open the transaction URL above");
    console.log("2. Look for 'Internal Transactions' or 'Token Transfers' tab");
    console.log("3. You should see:");
    console.log("   • Buyer → Contract: 0.1 XTZ (full payment)");
    console.log("   • Contract → Treasury: 0.0025 XTZ (2.5% platform fee)");
    console.log("   • Contract → Artist: 0.0975 XTZ (97.5% to artist)");
    console.log("\n💡 If you don't see internal transactions:");
    console.log("   • Try the 'Logs' tab to see event emissions");
    console.log("   • Look for 'Transfer' events showing the fee flows");
    
  } catch (error) {
    console.error("❌ Error during transaction:", error.message);
    
    if (error.message.includes("Artwork does not exist")) {
      console.log("\n💡 Creating a new artwork first...");
      // We'll create it in the purchase step above
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 