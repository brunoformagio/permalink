import { ethers } from "ethers";
import { 
  getContract, 
  prepareContractCall, 
  sendTransaction, 
  readContract 
} from "thirdweb";
import { client, etherlinkChain } from "./thirdweb";
import type { Account } from "thirdweb/wallets";

// ====== TYPE DEFINITIONS ======

export interface ArtworkSeries {
  artist: string;
  title: string;
  description: string;
  imageType: string;
  imageSize: number;
  price: string; // in ETH
  maxSupply: number;
  minted: number;
  isActive: boolean;
  createdAt: number;
}

export interface IndividualArtwork {
  seriesId: number;
  artist: string;
  title: string;
  description: string;
  imageType: string;
  imageSize: number;
  mintedAt: number;
}

export interface ArtistProfile {
  artistName: string;
  bio: string;
  avatarURI: string;
  totalSeriesCreated: number;
  totalNFTsCollected: number;
  isRegistered: boolean;
}

// Get environment configuration
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "testnet";

// Contract addresses using existing environment pattern
const PERMALINK_CONTRACT_ADDRESS = environment === "mainnet" 
  ? process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_MAINNET || ""
  : environment === "localhost"
  ? process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_LOCALHOST || ""
  : process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET || "";

const MARKETPLACE_CONTRACT_ADDRESS = environment === "mainnet" 
  ? process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_MAINNET || ""
  : environment === "localhost"
  ? process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_LOCALHOST || ""
  : process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET || "";

// Debug log contract addresses
console.log("🔧 Contract Configuration:");
console.log("  Environment:", environment);
console.log("  Permalink Contract:", PERMALINK_CONTRACT_ADDRESS);
console.log("  Marketplace Contract:", MARKETPLACE_CONTRACT_ADDRESS);

/**
 * Get thirdweb contract instance for Permalink ERC-721
 */
export function getThirdwebPermalinkContract() {
  return getContract({
    client,
    chain: etherlinkChain,
    address: PERMALINK_CONTRACT_ADDRESS,
  });
}

/**
 * Get thirdweb contract instance for Marketplace
 */
export function getThirdwebMarketplaceContract() {
  return getContract({
    client,
    chain: etherlinkChain,
    address: MARKETPLACE_CONTRACT_ADDRESS,
  });
}

// ====== SERIES FUNCTIONS ======

/**
 * Create new artwork series using thirdweb v5
 */
export async function createArtworkSeriesV5(
  account: Account,
  title: string,
  description: string,
  imageData: Uint8Array,
  imageType: string,
  priceInEth: string,
  maxSupply: number
): Promise<{ success: boolean; seriesId?: number; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebPermalinkContract();
    const priceInWei = ethers.parseEther(priceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function createArtworkSeries(string _title, string _description, bytes _imageData, string _imageType, uint256 _price, uint256 _maxSupply) returns (uint256)",
      params: [title, description, `0x${Array.from(imageData).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`, imageType, priceInWei, BigInt(maxSupply)],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    // TODO: Extract seriesId from transaction events
    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error creating artwork series:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Purchase NFT from series using thirdweb v5
 */
export async function purchaseFromSeriesV5(
  account: Account,
  seriesId: number,
  totalPriceInEth: string
): Promise<{ success: boolean; tokenId?: number; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebPermalinkContract();
    const totalPriceInWei = ethers.parseEther(totalPriceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function purchaseFromSeries(uint256 seriesId) returns (uint256)",
      params: [BigInt(seriesId)],
      value: totalPriceInWei,
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    // TODO: Extract tokenId from transaction events
    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error purchasing from series:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ====== READ FUNCTIONS ======

/**
 * Get artwork series details
 */
export async function getArtworkSeries(seriesId: number) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getArtworkSeries(uint256 seriesId) view returns (address artist, string title, string description, string imageType, uint256 imageSize, uint256 price, uint256 maxSupply, uint256 minted, bool isActive, uint256 createdAt)",
      params: [BigInt(seriesId)]
    });

    return {
      artist: result[0],
      title: result[1],
      description: result[2],
      imageType: result[3],
      imageSize: Number(result[4]),
      price: ethers.formatEther(result[5]),
      maxSupply: Number(result[6]),
      minted: Number(result[7]),
      isActive: result[8],
      createdAt: Number(result[9])
    };
  } catch (error) {
    console.error("Error getting artwork series:", error);
    return null;
  }
}

/**
 * Get individual artwork details
 */
export async function getIndividualArtwork(tokenId: number) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getIndividualArtwork(uint256 tokenId) view returns (uint256 seriesId, address artist, string title, string description, string imageType, uint256 imageSize, uint256 mintedAt)",
      params: [BigInt(tokenId)]
    });

    return {
      seriesId: Number(result[0]),
      artist: result[1],
      title: result[2],
      description: result[3],
      imageType: result[4],
      imageSize: Number(result[5]),
      mintedAt: Number(result[6])
    };
  } catch (error) {
    console.error("Error getting individual artwork:", error);
    return null;
  }
}

/**
 * Get artwork image data for generative art by token ID
 */
export async function getArtworkImageData(tokenId: number) {
  try {
    console.log("🔍 Getting image data for token ID:", tokenId);
    
    // Validate token ID first
    if (!tokenId || tokenId <= 0 || !Number.isInteger(tokenId)) {
      console.error("❌ Invalid token ID:", tokenId);
      return null;
    }
    
    const contract = getThirdwebPermalinkContract();
    console.log("📝 Contract address:", contract.address);
    console.log("🌐 Chain:", contract.chain.name);
    
    // Check if token exists by getting its owner
    try {
      const owner = await readContract({
        contract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(tokenId)]
      });
      console.log("✅ Token exists, owner:", owner);
    } catch (ownerError) {
      console.error("❌ Token doesn't exist or error checking owner:", {
        tokenId,
        error: ownerError,
        message: ownerError instanceof Error ? ownerError.message : 'Unknown error',
        type: typeof ownerError
      });
      return null;
    }
    
    const result = await readContract({
      contract,
      method: "function getArtworkImageData(uint256 tokenId) view returns (bytes imageData, string imageType)",
      params: [BigInt(tokenId)]
    });

    console.log("✅ Successfully got image data, type:", result[1]);
    return {
      imageData: result[0],
      imageType: result[1]
    };
  } catch (error) {
    console.error("❌ Error getting artwork image data:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tokenId: tokenId,
      contractAddress: PERMALINK_CONTRACT_ADDRESS,
      errorType: typeof error
    });
    return null;
  }
}

/**
 * Get artwork image data directly from series (for series that haven't been minted yet)
 */
export async function getSeriesImageData(seriesId: number) {
  try {
    console.log("🔍 Getting series image data for series ID:", seriesId);
    
    const contract = getThirdwebPermalinkContract();
    
    // Get the series data directly from the mapping
    const result = await readContract({
      contract,
      method: "function artworkSeries(uint256) view returns (uint256 seriesId, address artist, string title, string description, bytes imageData, string imageType, uint256 price, uint256 maxSupply, uint256 minted, bool isActive, uint256 createdAt)",
      params: [BigInt(seriesId)]
    });
    
    console.log("✅ Successfully got series image data, type:", result[5]);
    return {
      imageData: result[4], // imageData is the 5th field (index 4)
      imageType: result[5]  // imageType is the 6th field (index 5)
    };
  } catch (error) {
    console.error("❌ Error getting series image data:", error);
    console.error("❌ Series error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      seriesId: seriesId,
      contractAddress: PERMALINK_CONTRACT_ADDRESS
    });
    return null;
  }
}

/**
 * Get image data with automatic fallback between token and series
 */
export async function getImageDataWithFallback(tokenIdOrSeriesId: number, preferSeries: boolean = false) {
  try {
    console.log("🔄 Getting image data with fallback for ID:", tokenIdOrSeriesId);
    
    if (preferSeries) {
      // Try series first
      const seriesData = await getSeriesImageData(tokenIdOrSeriesId);
      if (seriesData) {
        console.log("✅ Got data from series");
        return seriesData;
      }
      
      // Fallback to token
      const tokenData = await getArtworkImageData(tokenIdOrSeriesId);
      if (tokenData) {
        console.log("✅ Got data from token (fallback)");
        return tokenData;
      }
    } else {
      // Try token first
      const tokenData = await getArtworkImageData(tokenIdOrSeriesId);
      if (tokenData) {
        console.log("✅ Got data from token");
        return tokenData;
      }
      
      // Fallback to series
      const seriesData = await getSeriesImageData(tokenIdOrSeriesId);
      if (seriesData) {
        console.log("✅ Got data from series (fallback)");
        return seriesData;
      }
    }
    
    console.warn("⚠️ No image data found for ID:", tokenIdOrSeriesId);
    return null;
  } catch (error) {
    console.error("❌ Error in getImageDataWithFallback:", error);
    return null;
  }
}



/**
 * Get tokens from a series
 */
export async function getSeriesTokens(seriesId: number) {
  try {
    console.log("🔍 Getting tokens for series ID:", seriesId);
    
    // Validate series ID
    if (!seriesId || seriesId <= 0 || !Number.isInteger(seriesId)) {
      console.error("❌ Invalid series ID:", seriesId);
      return [];
    }
    
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getSeriesTokens(uint256 seriesId) view returns (uint256[])",
      params: [BigInt(seriesId)]
    });

    const tokenIds = result.map(id => Number(id)).filter(id => id > 0); // Filter out any 0 or invalid IDs
    console.log("✅ Found series tokens:", tokenIds);
    return tokenIds;
  } catch (error) {
    console.error("❌ Error getting series tokens:", {
      seriesId,
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Get series created by an artist
 */
export async function getArtistSeries(artistAddress: string) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getArtistSeries(address artist) view returns (uint256[])",
      params: [artistAddress as `0x${string}`]
    });

    return result.map(id => Number(id));
  } catch (error) {
    console.error("Error getting artist series:", error);
    return [];
  }
}

/**
 * Get tokens collected by a user
 */
export async function getCollectorTokens(collectorAddress: string) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getCollectorTokens(address collector) view returns (uint256[])",
      params: [collectorAddress as `0x${string}`]
    });

    return result.map(id => Number(id));
  } catch (error) {
    console.error("Error getting collector tokens:", error);
    return [];
  }
}

/**
 * Get token owner (ERC-721 specific)
 */
export async function getTokenOwner(tokenId: number) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function ownerOf(uint256 tokenId) view returns (address)",
      params: [BigInt(tokenId)]
    });

    return result;
  } catch (error) {
    console.error("Error getting token owner:", error);
    return null;
  }
}

/**
 * Check if user owns a specific token
 */
export async function doesUserOwnToken(userAddress: string, tokenId: number): Promise<boolean> {
  try {
    const owner = await getTokenOwner(tokenId);
    return owner?.toLowerCase() === userAddress.toLowerCase();
  } catch (error) {
    console.error("Error checking token ownership:", error);
    return false;
  }
}

/**
 * Get user's token balance (count of tokens owned)
 */
export async function getUserTokenCount(userAddress: string) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function balanceOf(address owner) view returns (uint256)",
      params: [userAddress as `0x${string}`]
    });

    return Number(result);
  } catch (error) {
    console.error("Error getting user token count:", error);
    return 0;
  }
}

// ====== MARKETPLACE FUNCTIONS ======

/**
 * Create a listing on the marketplace
 */
export async function createListingV5(
  account: Account,
  tokenId: number,
  priceInEth: string
): Promise<{ success: boolean; listingId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebMarketplaceContract();
    const priceInWei = ethers.parseEther(priceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function createListing(uint256 tokenId, uint256 price) returns (bytes32)",
      params: [BigInt(tokenId), priceInWei],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error creating listing:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Buy from a marketplace listing
 */
export async function buyFromListingV5(
  account: Account,
  listingId: string,
  priceInEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebMarketplaceContract();
    const priceInWei = ethers.parseEther(priceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function buyFromListing(bytes32 listingId)",
      params: [listingId as `0x${string}`],
      value: priceInWei,
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error buying from listing:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Make an offer on a token
 */
export async function makeOfferV5(
  account: Account,
  tokenId: number,
  offerPriceInEth: string,
  durationInDays: number
): Promise<{ success: boolean; offerId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebMarketplaceContract();
    const offerPriceInWei = ethers.parseEther(offerPriceInEth);
    const durationInSeconds = durationInDays * 24 * 60 * 60;
    
    const transaction = prepareContractCall({
      contract,
      method: "function makeOffer(uint256 tokenId, uint256 duration) returns (bytes32)",
      params: [BigInt(tokenId), BigInt(durationInSeconds)],
      value: offerPriceInWei,
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error making offer:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ====== PROFILE FUNCTIONS ======

/**
 * Update artist profile using thirdweb v5
 */
export async function updateArtistProfileV5(
  account: Account,
  name: string,
  bio: string,
  avatarURI: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const transaction = prepareContractCall({
      contract,
      method: "function updateArtistProfile(string _name, string _bio, string _avatarURI)",
      params: [name, bio, avatarURI],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error updating artist profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get artist profile
 */
export async function getArtistProfile(artistAddress: string) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getArtistProfile(address artist) view returns (string artistName, string bio, string avatarURI, uint256 totalSeriesCreated, uint256 totalNFTsCollected, bool isRegistered)",
      params: [artistAddress as `0x${string}`]
    });

    return {
      artistName: result[0],
      bio: result[1],
      avatarURI: result[2],
      totalSeriesCreated: Number(result[3]),
      totalNFTsCollected: Number(result[4]),
      isRegistered: result[5]
    };
  } catch (error) {
    console.error("Error getting artist profile:", error);
    return null;
  }
}

// ====== UTILITY FUNCTIONS ======

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Get account from thirdweb wallet
 */
export function getAccountFromWallet(wallet: any): Account | null {
  try {
    const account = wallet.getAccount();
    return account || null;
  } catch (error) {
    console.error("Error getting account from wallet:", error);
    return null;
  }
}

// ====== CURRENT TOKEN ID GETTERS ======

/**
 * Get current series ID
 */
export async function getCurrentSeriesId(): Promise<number> {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getCurrentSeriesId() view returns (uint256)",
      params: []
    });

    return Number(result);
  } catch (error) {
    console.error("Error getting current series ID:", error);
    return 0;
  }
}

/**
 * Get current token ID
 */
export async function getCurrentTokenId(): Promise<number> {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getCurrentTokenId() view returns (uint256)",
      params: []
    });

    return Number(result);
  } catch (error) {
    console.error("Error getting current token ID:", error);
    return 0;
  }
}

/**
 * Test contract connectivity and basic functions
 */
export async function testContractConnectivity(): Promise<{ success: boolean; details: any }> {
  try {
    console.log("🧪 Testing contract connectivity...");
    
    const contract = getThirdwebPermalinkContract();
    console.log("📝 Contract created:", {
      address: contract.address,
      chain: contract.chain.name
    });
    
    // Test 1: Get current series ID (should always work if contract is deployed)
    try {
      const seriesId = await getCurrentSeriesId();
      console.log("✅ Test 1 passed - Current series ID:", seriesId);
    } catch (error) {
      console.error("❌ Test 1 failed - getCurrentSeriesId:", error);
      return { success: false, details: { step: "getCurrentSeriesId", error } };
    }
    
    // Test 2: Get current token ID
    try {
      const tokenId = await getCurrentTokenId();
      console.log("✅ Test 2 passed - Current token ID:", tokenId);
    } catch (error) {
      console.error("❌ Test 2 failed - getCurrentTokenId:", error);
      return { success: false, details: { step: "getCurrentTokenId", error } };
    }
    
    console.log("🎉 All connectivity tests passed!");
    return { success: true, details: "All tests passed" };
    
  } catch (error) {
    console.error("❌ Contract connectivity test failed:", error);
    return { success: false, details: { step: "setup", error } };
  }
} 