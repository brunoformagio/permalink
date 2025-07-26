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
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getArtworkImageData(uint256 tokenId) view returns (bytes imageData, string imageType)",
      params: [BigInt(tokenId)]
    });

    return {
      imageData: result[0],
      imageType: result[1]
    };
  } catch (error) {
    console.error("Error getting artwork image data:", error);
    return null;
  }
}



/**
 * Get tokens from a series
 */
export async function getSeriesTokens(seriesId: number) {
  try {
    const contract = getThirdwebPermalinkContract();
    
    const result = await readContract({
      contract,
      method: "function getSeriesTokens(uint256 seriesId) view returns (uint256[])",
      params: [BigInt(seriesId)]
    });

    return result.map(id => Number(id));
  } catch (error) {
    console.error("Error getting series tokens:", error);
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