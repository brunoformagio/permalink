const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing Treasury Wallet as Artist Scenario\n");

  // Get contract addresses
  const contractAddress = "0x95a7E9152Aeb314700f6EF3827BfEE57BD73f0bd";  // NEW FIXED CONTRACT
  const treasuryAddress = "0xa2d2d9398d43a28400238662AbA4B96Fc03Dcd22";
  
  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("🎯 Test Scenario:");
  console.log("Treasury Address:", treasuryAddress);
  console.log("Deployer Address:", deployer.address);
  console.log("Are they the same?", treasuryAddress.toLowerCase() === deployer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log("");

  // Get contract instance
  const Permalink = await ethers.getContractAt("Permalink", contractAddress);

  // Get fee configuration
  const platformFeePercentage = await Permalink.platformFeePercentage();
  const configuredTreasury = await Permalink.treasuryAddress();
  
  console.log("📊 Current Configuration:");
  console.log("Platform Fee:", Number(platformFeePercentage) / 100 + "%");
  console.log("Configured Treasury:", configuredTreasury);
  console.log("");

  // Test Case 1: Normal Artist (not treasury)
  console.log("🧪 TEST CASE 1: Normal Artist Sale");
  console.log("=".repeat(50));
  
  const normalArtistAddress = "0x1234567890123456789012345678901234567890"; // Example
  const purchasePrice = ethers.parseEther("1.0"); // 1 XTZ
  
  // Calculate fees for normal artist
  const platformFee = (purchasePrice * platformFeePercentage) / 10000n;
  const artistPayment = purchasePrice - platformFee;
  
  console.log("Purchase Price: 1.0 XTZ");
  console.log("Artist Address:", normalArtistAddress);
  console.log("Platform Fee → Treasury:", ethers.formatEther(platformFee), "XTZ");
  console.log("Artist Payment → Artist:", ethers.formatEther(artistPayment), "XTZ");
  console.log("Artist Receives:", Number((artistPayment * 10000n) / purchasePrice) / 100 + "%");
  console.log("");

  // Test Case 2: Treasury as Artist
  console.log("🧪 TEST CASE 2: Treasury Wallet as Artist");
  console.log("=".repeat(50));
  
  console.log("Purchase Price: 1.0 XTZ");
  console.log("Artist Address:", treasuryAddress, "(SAME AS TREASURY)");
  console.log("Platform Fee → Treasury:", ethers.formatEther(platformFee), "XTZ");
  console.log("Artist Payment → Treasury:", ethers.formatEther(artistPayment), "XTZ (SAME WALLET!)");
  
  const totalTreasuryReceives = platformFee + artistPayment;
  console.log("");
  console.log("💰 TREASURY RECEIVES:");
  console.log("From Platform Fee:", ethers.formatEther(platformFee), "XTZ");
  console.log("From Artist Payment:", ethers.formatEther(artistPayment), "XTZ");
  console.log("TOTAL RECEIVED:", ethers.formatEther(totalTreasuryReceives), "XTZ");
  console.log("Percentage:", Number((totalTreasuryReceives * 10000n) / purchasePrice) / 100 + "%");
  console.log("");

  // Analysis
  console.log("📋 ANALYSIS:");
  console.log("=".repeat(50));
  
  if (totalTreasuryReceives === purchasePrice) {
    console.log("✅ Treasury receives 100% when acting as artist");
    console.log("⚠️  This creates different treatment:");
    console.log("   • Normal Artists: 97.5% of sale price");
    console.log("   • Treasury Artist: 100% of sale price");
    console.log("");
    
    console.log("🤔 IMPLICATIONS:");
    console.log("1. Treasury/Platform content is more profitable");
    console.log("2. Creates potential unfair advantage");
    console.log("3. May or may not be intentional design");
    console.log("");
    
    console.log("💡 POTENTIAL SOLUTIONS:");
    console.log("A) Keep as-is (Treasury gets 100% for platform content)");
    console.log("B) Skip platform fee when treasury is artist");
    console.log("C) Still charge platform fee but send to separate address");
    console.log("D) Create special treasury artist fee structure");
    
  } else {
    console.log("❌ Unexpected calculation result");
  }

  // Test Case 3: What if we wanted to fix this?
  console.log("\n🧪 TEST CASE 3: Alternative Fair Distribution");
  console.log("=".repeat(50));
  
  console.log("Option A - Skip platform fee for treasury artist:");
  console.log("  Treasury Payment: 1.0 XTZ (100%)");
  console.log("  Platform Fee: 0.0 XTZ (skipped)");
  console.log("");
  
  console.log("Option B - Consistent fee, different destination:");
  console.log("  Treasury Payment: 0.975 XTZ (97.5%)");
  console.log("  Platform Fee: 0.025 XTZ → Burn/DAO/Separate fund");
  console.log("");
  
  console.log("Option C - Treasury artist pays reduced fee:");
  const reducedFee = (purchasePrice * 100n) / 10000n; // 1% instead of 2.5%
  const treasuryArtistPayment = purchasePrice - reducedFee;
  console.log("  Treasury Payment:", ethers.formatEther(treasuryArtistPayment), "XTZ (99%)");
  console.log("  Platform Fee:", ethers.formatEther(reducedFee), "XTZ (1%)");
  console.log("");

  // Check current blockchain state
  console.log("🔍 CURRENT BLOCKCHAIN STATE:");
  console.log("=".repeat(50));
  
  const treasuryBalance = await ethers.provider.getBalance(treasuryAddress);
  const contractBalance = await ethers.provider.getBalance(contractAddress);
  
  console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "XTZ");
  console.log("Contract Balance:", ethers.formatEther(contractBalance), "XTZ");
  
  // Check if treasury has created any artworks
  try {
    const currentTokenId = await Permalink.getCurrentTokenId();
    console.log("Total Artworks Created:", Number(currentTokenId));
    
    if (currentTokenId > 0) {
      console.log("\nChecking if treasury created any artworks...");
      for (let i = 1; i <= Math.min(Number(currentTokenId), 5); i++) {
        try {
          const artwork = await Permalink.getArtwork(i);
          if (artwork.artist.toLowerCase() === treasuryAddress.toLowerCase()) {
            console.log(`  Token ${i}: Created by TREASURY ⚠️`);
          } else {
            console.log(`  Token ${i}: Created by ${artwork.artist}`);
          }
        } catch (error) {
          console.log(`  Token ${i}: Error fetching data`);
        }
      }
    }
  } catch (error) {
    console.log("Could not check artwork data");
  }

  console.log("\n📝 RECOMMENDATION:");
  console.log("=".repeat(50));
  console.log("The current implementation creates an advantage for the treasury wallet");
  console.log("when it acts as an artist. This may be intentional (platform content");
  console.log("generates more revenue) or unintentional. Consider if this aligns");
  console.log("with your platform's fairness and tokenomics goals.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 