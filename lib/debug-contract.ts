import { 
  testContractConnectivity, 
  getCurrentTokenId, 
  getCurrentSeriesId,
  getArtworkImageData,
  getSeriesImageData,
  getThirdwebPermalinkContract
} from './contractERC721';
import { readContract } from 'thirdweb';

/**
 * Debug script to identify the issue with getArtworkImageData
 */
export async function debugContractIssue() {
  console.log("🔧 Starting contract debugging...");
  
  // Step 1: Test basic connectivity
  console.log("\n1️⃣ Testing contract connectivity...");
  const connectivityTest = await testContractConnectivity();
  console.log("Connectivity result:", connectivityTest);
  
  if (!connectivityTest.success) {
    console.error("❌ Basic connectivity failed. Check network and contract deployment.");
    return { step: "connectivity", result: connectivityTest };
  }
  
  // Step 2: Get current IDs
  console.log("\n2️⃣ Getting current token and series IDs...");
  const currentTokenId = await getCurrentTokenId();
  const currentSeriesId = await getCurrentSeriesId();
  console.log("Current Token ID:", currentTokenId);
  console.log("Current Series ID:", currentSeriesId);
  
  // Step 3: Check if contract has the getArtworkImageData method
  console.log("\n3️⃣ Testing if getArtworkImageData method exists...");
  const contract = getThirdwebPermalinkContract();
  
  try {
    // Try to call with token ID 1 (if it exists)
    if (currentTokenId > 0) {
      console.log("Testing getArtworkImageData with token ID 1...");
      const imageData = await getArtworkImageData(1);
      console.log("✅ getArtworkImageData works, result:", imageData);
    } else {
      console.log("⚠️ No tokens minted yet, can't test getArtworkImageData");
    }
  } catch (error) {
    console.error("❌ getArtworkImageData failed:", error);
  }
  
  // Step 4: Check if we can get series data instead
  console.log("\n4️⃣ Testing getSeriesImageData...");
  try {
    if (currentSeriesId > 0) {
      console.log("Testing getSeriesImageData with series ID 1...");
      const seriesData = await getSeriesImageData(1);
      console.log("✅ getSeriesImageData works, result:", seriesData);
    } else {
      console.log("⚠️ No series created yet, can't test getSeriesImageData");
    }
  } catch (error) {
    console.error("❌ getSeriesImageData failed:", error);
  }
  
  // Step 5: Check if we can get basic contract info
  console.log("\n5️⃣ Testing basic contract calls...");
  try {
    // Just get the current series count which should always work
    console.log("Contract address being used:", contract.address);
    console.log("Chain ID:", contract.chain.id);
  } catch (error) {
    console.error("❌ Can't get basic contract info:", error);
  }
  
  console.log("\n🏁 Debug complete!");
  return {
    currentTokenId,
    currentSeriesId,
    contractAddress: contract.address
  };
}

/**
 * Quick test for a specific token ID
 */
export async function testSpecificTokenId(tokenId: number) {
  console.log(`🔍 Testing specific token ID: ${tokenId}`);
  
  try {
    const imageData = await getArtworkImageData(tokenId);
    console.log("Result:", imageData);
    return imageData;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

/**
 * Check what token IDs actually exist
 */
export async function findExistingTokens() {
  console.log("🔍 Finding existing tokens...");
  const contract = getThirdwebPermalinkContract();
  const currentTokenId = await getCurrentTokenId();
  
  const existingTokens = [];
  
  for (let i = 1; i <= Math.min(currentTokenId, 10); i++) {
    try {
      const owner = await readContract({
        contract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(i)]
      });
      console.log(`✅ Token ${i} exists, owner: ${owner}`);
      existingTokens.push(i);
    } catch (error) {
      console.log(`❌ Token ${i} doesn't exist`);
    }
  }
  
  return existingTokens;
} 