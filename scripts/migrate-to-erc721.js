const hre = require("hardhat");

async function main() {
  console.log("🔄 Permalink Migration: ERC-1155 → ERC-721");
  console.log("═".repeat(50));
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Migration account:", deployer.address);

  // Contract addresses (update these with your deployed addresses)
  const OLD_PERMALINK_ADDRESS = process.env.OLD_PERMALINK_CONTRACT_ADDRESS || "";
  const NEW_PERMALINK_ADDRESS = process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS || "";
  const NEW_MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || "";

  if (!OLD_PERMALINK_ADDRESS) {
    console.log("⚠️  Warning: OLD_PERMALINK_CONTRACT_ADDRESS not set");
    console.log("   Set this to migrate data from existing contract");
  }

  if (!NEW_PERMALINK_ADDRESS || !NEW_MARKETPLACE_ADDRESS) {
    console.error("❌ Error: New contract addresses not set");
    console.log("   Run deploy-erc721.js first and update your .env file");
    process.exit(1);
  }

  try {
    // Connect to new contracts
    console.log("\n🔗 Connecting to new ERC-721 contracts...");
    const Permalink = await hre.ethers.getContractFactory("Permalink");
    const newPermalink = Permalink.attach(NEW_PERMALINK_ADDRESS);
    
    const Marketplace = await hre.ethers.getContractFactory("PermalinkMarketplace");
    const newMarketplace = Marketplace.attach(NEW_MARKETPLACE_ADDRESS);

    // Verify new contracts
    console.log("✅ New Permalink:", await newPermalink.name());
    console.log("✅ New Marketplace fee:", (await newMarketplace.marketplaceFee()).toString(), "bp");

    if (OLD_PERMALINK_ADDRESS) {
      console.log("\n📊 Analyzing old contract data...");
      
      // Connect to old contract (assuming it exists)
      try {
        const oldPermalink = Permalink.attach(OLD_PERMALINK_ADDRESS);
        const currentTokenId = await oldPermalink.getCurrentTokenId();
        console.log(`📈 Old contract has ${currentTokenId} tokens`);
        
        // This is where you would add data migration logic
        console.log("💡 Data migration would happen here");
        console.log("   - Artists would need to recreate their artwork series");
        console.log("   - Existing token holders keep their old tokens");
        console.log("   - New sales happen on ERC-721 contract");
        
      } catch (error) {
        console.log("⚠️  Could not connect to old contract:", error.message);
      }
    }

    // Setup instructions
    console.log("\n📋 Migration Checklist:");
    console.log("═".repeat(50));
    console.log("✅ 1. Deploy ERC-721 contracts");
    console.log("⏳ 2. Update frontend to use new contract addresses");
    console.log("⏳ 3. Update contract integration functions");
    console.log("⏳ 4. Test series creation");
    console.log("⏳ 5. Test NFT minting from series");
    console.log("⏳ 6. Test marketplace functionality");
    console.log("⏳ 7. Notify artists to create new series");
    console.log("⏳ 8. Communicate migration to users");

    console.log("\n🎯 Key Changes for Artists:");
    console.log("• Instead of: Mint artwork with X editions");
    console.log("• Now do:     Create artwork series with X max supply");
    console.log("• Buyers get: Unique token IDs (001, 002, 003...)");
    console.log("• Generative: Each token ID = unique artwork variation");

    console.log("\n🎯 Key Changes for Buyers:");
    console.log("• Instead of: Own 'X copies of token Y'");
    console.log("• Now own:    'Token #123' (unique NFT)");
    console.log("• Generative: Your token shows unique art based on token ID");
    console.log("• Trading:    List/buy individual tokens, not amounts");

    console.log("\n📱 Frontend Updates Needed:");
    console.log("• Create page: Use createArtworkSeriesV5()");
    console.log("• Item page:   Use purchaseFromSeriesV5()");
    console.log("• Gallery:     Show series + individual tokens");
    console.log("• Profile:     Show owned tokens (not balances)");
    console.log("• Marketplace: List individual tokens");
    
    console.log("\n✨ Migration plan ready!");
    console.log("   Execute the checklist items above in order");

  } catch (error) {
    console.error("❌ Migration planning failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }); 