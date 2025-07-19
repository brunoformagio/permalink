const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🔍 SIMPLE FEE TRACING");
  console.log("=====================");
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log(`\n📍 Deployer/Treasury: ${deployer.address}`);
  
  // Connect to contracts
  const permalink = await hre.ethers.getContractAt("Permalink", process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET);
  
  console.log(`\n📋 Contract Address:`);
  console.log(`Permalink: ${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET}`);
  
  try {
    // Check if there are existing artworks
    console.log("\n🔍 Checking existing artworks...");
    
    for (let tokenId = 1; tokenId <= 5; tokenId++) {
      try {
        const artwork = await permalink.getArtwork(tokenId);
        console.log(`\n🎨 Artwork ${tokenId}:`);
        console.log(`  Title: ${artwork.title}`);
        console.log(`  Price: ${ethers.formatEther(artwork.price)} XTZ`);
        console.log(`  Supply: ${artwork.currentSupply}/${artwork.maxSupply}`);
        console.log(`  Active: ${artwork.isActive}`);
        console.log(`  Artist: ${artwork.artist}`);
        
        // If this is an active artwork, let's try to purchase it
        if (artwork.isActive && artwork.currentSupply < artwork.maxSupply) {
          console.log(`\n💳 PURCHASING ARTWORK ${tokenId} (TRACE THIS TRANSACTION):`);
          console.log("=======================================================");
          
          const initialBalance = await hre.ethers.provider.getBalance(deployer.address);
          console.log(`💰 Initial Balance: ${ethers.formatEther(initialBalance)} XTZ`);
          
          // Purchase 1 edition
          const purchaseTx = await permalink.purchaseArtwork(tokenId, 1, {
            value: artwork.price
          });
          
          console.log(`\n🎯 **TRACE THIS TRANSACTION:** ${purchaseTx.hash}`);
          console.log(`🔗 Block Explorer: https://testnet.explorer.etherlink.com/tx/${purchaseTx.hash}`);
          
          const receipt = await purchaseTx.wait();
          console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
          
          const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
          const difference = finalBalance - initialBalance;
          
          console.log(`\n💰 Final Balance: ${ethers.formatEther(finalBalance)} XTZ`);
          console.log(`📈 Balance Change: ${ethers.formatEther(difference)} XTZ`);
          
          console.log("\n🔍 HOW TO TRACE FEES IN BLOCK EXPLORER:");
          console.log("=====================================");
          console.log("1. Open the transaction URL above");
          console.log("2. Look for 'Internal Transactions' or 'Token Transfers' tab");
          console.log("3. Expected fee flows:");
          console.log(`   • Buyer → Contract: ${ethers.formatEther(artwork.price)} XTZ (full payment)`);
          console.log(`   • Contract → Treasury: ${ethers.formatEther(artwork.price * BigInt(250) / BigInt(10000))} XTZ (2.5% platform fee)`);
          console.log(`   • Contract → Artist: ${ethers.formatEther(artwork.price * BigInt(9750) / BigInt(10000))} XTZ (97.5% to artist)`);
          console.log("\n💡 If internal transactions aren't visible:");
          console.log("   • Check the 'Logs' tab for Transfer events");
          console.log("   • Look for multiple XTZ transfers within the transaction");
          
          break; // Exit after first successful purchase
        }
      } catch (error) {
        // Artwork doesn't exist, continue checking
        continue;
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    console.log("\n💡 ALTERNATIVE: Using existing transaction analysis");
    console.log("================================================");
    console.log("Since we can't create a new purchase, let's explain");
    console.log("how to trace fees in any existing purchase transaction:");
    console.log("");
    console.log("🔍 WHAT TO LOOK FOR IN BLOCK EXPLORER:");
    console.log("====================================");
    console.log("1. Go to any purchase transaction");
    console.log("2. Click 'Internal Transactions' tab");
    console.log("3. You should see multiple XTZ transfers:");
    console.log("   • FROM buyer TO contract (full purchase amount)");
    console.log("   • FROM contract TO treasury (2.5% platform fee)");
    console.log("   • FROM contract TO artist (97.5% payment)");
    console.log("");
    console.log("🚨 IF YOU DON'T SEE INTERNAL TRANSACTIONS:");
    console.log("==========================================");
    console.log("• Some block explorers hide internal txns by default");
    console.log("• Try clicking 'Show Internal Transactions' toggle");
    console.log("• Check the 'Logs' tab for Transfer events");
    console.log("• Look for multiple entries with different addresses");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 