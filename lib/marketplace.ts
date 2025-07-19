import { ethers } from "ethers";
import { createThirdwebClient, getContract as getThirdwebContract, prepareContractCall, sendTransaction } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { getMarketplaceAddress, getEtherlinkChain } from "./contract-config";
import { client } from "./thirdweb";

// Import the compiled ABI for the marketplace
// TODO: Uncomment after compiling the contract
// import PermalinkMarketplaceABI from "../artifacts/contracts/PermalinkMarketplace.sol/PermalinkMarketplace.json";

// Temporary minimal ABI until contract is compiled
const PermalinkMarketplaceABI = {
  abi: [
    "function createListing(uint256 tokenId, uint256 amount, uint256 pricePerToken) returns (bytes32)",
    "function cancelListing(bytes32 listingId)",
    "function buyFromListing(bytes32 listingId, uint256 amount) payable",
    "function makeOffer(uint256 tokenId, uint256 amount, uint256 pricePerToken, uint256 duration) payable returns (bytes32)",
    "function acceptOffer(bytes32 offerId, uint256 amount)",
    "function cancelOffer(bytes32 offerId)",
    "function getTokenListings(uint256 tokenId) view returns (bytes32[])",
    "function getTokenOffers(uint256 tokenId) view returns (bytes32[])",
    "function getUserListings(address user) view returns (bytes32[])",
    "function getUserOffers(address user) view returns (bytes32[])",
    "function marketplaceFee() view returns (uint256)",
    "function listings(bytes32) view returns (uint256 tokenId, uint256 amount, uint256 pricePerToken, address seller, uint256 listedAt, bool isActive)",
    "function offers(bytes32) view returns (uint256 tokenId, uint256 amount, uint256 pricePerToken, address buyer, uint256 expiresAt, bool isActive)"
  ]
};

// Types
export interface Listing {
  listingId: string;
  tokenId: number;
  amount: number;
  pricePerToken: string; // in ETH
  seller: string;
  listedAt: number;
  isActive: boolean;
}

export interface Offer {
  offerId: string;
  tokenId: number;
  amount: number;
  pricePerToken: string; // in ETH
  buyer: string;
  expiresAt: number;
  isActive: boolean;
}

export interface MarketplaceStats {
  totalListings: number;
  totalOffers: number;
  marketplaceFee: number; // basis points
}

/**
 * Get thirdweb marketplace contract instance
 */
function getMarketplaceContract() {
  const marketplaceAddress = getMarketplaceAddress();
  if (!marketplaceAddress) {
    throw new Error("Marketplace address not configured");
  }
  
  return getThirdwebContract({
    client,
    chain: getEtherlinkChain(),
    address: marketplaceAddress,
    abi: PermalinkMarketplaceABI.abi as any,
  });
}

/**
 * Get read-only marketplace contract instance
 */
export function getMarketplaceContractReadOnly(provider?: ethers.Provider) {
  const marketplaceAddress = getMarketplaceAddress();
  if (!marketplaceAddress) {
    throw new Error("Marketplace address not configured");
  }
  
  const rpcProvider = provider || new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL_TESTNET || "https://node.ghostnet.etherlink.com"
  );
  
  return new ethers.Contract(marketplaceAddress, PermalinkMarketplaceABI.abi, rpcProvider);
}

/**
 * Create a listing on the marketplace
 */
export async function createListing(
  account: Account,
  tokenId: number,
  amount: number,
  pricePerTokenInEth: string
): Promise<{ success: boolean; listingId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    const priceInWei = ethers.parseEther(pricePerTokenInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function createListing(uint256 tokenId, uint256 amount, uint256 pricePerToken) returns (bytes32)",
      params: [BigInt(tokenId), BigInt(amount), priceInWei],
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
 * Cancel a listing
 */
export async function cancelListing(
  account: Account,
  listingId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    
    const transaction = prepareContractCall({
      contract,
      method: "function cancelListing(bytes32 listingId)",
      params: [listingId as `0x${string}`],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error cancelling listing:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Buy from a listing
 */
export async function buyFromListing(
  account: Account,
  listingId: string,
  amount: number,
  totalPriceInEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    const totalPriceInWei = ethers.parseEther(totalPriceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function buyFromListing(bytes32 listingId, uint256 amount) payable",
      params: [listingId as `0x${string}`, BigInt(amount)],
      value: totalPriceInWei,
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
 * Make an offer
 */
export async function makeOffer(
  account: Account,
  tokenId: number,
  amount: number,
  pricePerTokenInEth: string,
  durationInDays: number
): Promise<{ success: boolean; offerId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    const priceInWei = ethers.parseEther(pricePerTokenInEth);
    const totalOfferPrice = priceInWei * BigInt(amount);
    const durationInSeconds = durationInDays * 24 * 60 * 60;
    
    const transaction = prepareContractCall({
      contract,
      method: "function makeOffer(uint256 tokenId, uint256 amount, uint256 pricePerToken, uint256 duration) payable returns (bytes32)",
      params: [BigInt(tokenId), BigInt(amount), priceInWei, BigInt(durationInSeconds)],
      value: totalOfferPrice,
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

/**
 * Accept an offer
 */
export async function acceptOffer(
  account: Account,
  offerId: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    
    const transaction = prepareContractCall({
      contract,
      method: "function acceptOffer(bytes32 offerId, uint256 amount)",
      params: [offerId as `0x${string}`, BigInt(amount)],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error accepting offer:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Cancel an offer
 */
export async function cancelOffer(
  account: Account,
  offerId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    
    const transaction = prepareContractCall({
      contract,
      method: "function cancelOffer(bytes32 offerId)",
      params: [offerId as `0x${string}`],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error cancelling offer:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get listings for a token
 */
export async function getTokenListings(tokenId: number): Promise<Listing[]> {
  try {
    const contract = getMarketplaceContractReadOnly();
    const listingIds = await contract.getTokenListings(tokenId);
    
    const listings = await Promise.all(
      listingIds.map(async (listingId: string) => {
        const listing = await contract.listings(listingId);
        return {
          listingId,
          tokenId: Number(listing.tokenId),
          amount: Number(listing.amount),
          pricePerToken: ethers.formatEther(listing.pricePerToken),
          seller: listing.seller,
          listedAt: Number(listing.listedAt),
          isActive: listing.isActive
        };
      })
    );
    
    return listings.filter(listing => listing.isActive);
  } catch (error) {
    console.error("Error fetching token listings:", error);
    return [];
  }
}

/**
 * Get offers for a token
 */
export async function getTokenOffers(tokenId: number): Promise<Offer[]> {
  try {
    const contract = getMarketplaceContractReadOnly();
    const offerIds = await contract.getTokenOffers(tokenId);
    
    const offers = await Promise.all(
      offerIds.map(async (offerId: string) => {
        const offer = await contract.offers(offerId);
        return {
          offerId,
          tokenId: Number(offer.tokenId),
          amount: Number(offer.amount),
          pricePerToken: ethers.formatEther(offer.pricePerToken),
          buyer: offer.buyer,
          expiresAt: Number(offer.expiresAt),
          isActive: offer.isActive
        };
      })
    );
    
    // Filter out expired and inactive offers
    const now = Math.floor(Date.now() / 1000);
    return offers.filter(offer => offer.isActive && offer.expiresAt > now);
  } catch (error) {
    console.error("Error fetching token offers:", error);
    return [];
  }
}

/**
 * Get user's listings
 */
export async function getUserListings(userAddress: string): Promise<Listing[]> {
  try {
    const contract = getMarketplaceContractReadOnly();
    const listingIds = await contract.getUserListings(userAddress);
    
    const listings = await Promise.all(
      listingIds.map(async (listingId: string) => {
        const listing = await contract.listings(listingId);
        return {
          listingId,
          tokenId: Number(listing.tokenId),
          amount: Number(listing.amount),
          pricePerToken: ethers.formatEther(listing.pricePerToken),
          seller: listing.seller,
          listedAt: Number(listing.listedAt),
          isActive: listing.isActive
        };
      })
    );
    
    return listings.filter(listing => listing.isActive);
  } catch (error) {
    console.error("Error fetching user listings:", error);
    return [];
  }
}

/**
 * Get user's offers
 */
export async function getUserOffers(userAddress: string): Promise<Offer[]> {
  try {
    const contract = getMarketplaceContractReadOnly();
    const offerIds = await contract.getUserOffers(userAddress);
    
    const offers = await Promise.all(
      offerIds.map(async (offerId: string) => {
        const offer = await contract.offers(offerId);
        return {
          offerId,
          tokenId: Number(offer.tokenId),
          amount: Number(offer.amount),
          pricePerToken: ethers.formatEther(offer.pricePerToken),
          buyer: offer.buyer,
          expiresAt: Number(offer.expiresAt),
          isActive: offer.isActive
        };
      })
    );
    
    const now = Math.floor(Date.now() / 1000);
    return offers.filter(offer => offer.isActive && offer.expiresAt > now);
  } catch (error) {
    console.error("Error fetching user offers:", error);
    return [];
  }
}

/**
 * Get marketplace statistics
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  try {
    const contract = getMarketplaceContractReadOnly();
    const marketplaceFee = await contract.marketplaceFee();
    
    return {
      totalListings: 0, // Would need to track this separately
      totalOffers: 0,   // Would need to track this separately
      marketplaceFee: Number(marketplaceFee)
    };
  } catch (error) {
    console.error("Error fetching marketplace stats:", error);
    return {
      totalListings: 0,
      totalOffers: 0,
      marketplaceFee: 100 // Default 1%
    };
  }
}

/**
 * Check if user has approved marketplace for trading
 */
export async function isMarketplaceApproved(userAddress: string, nftContractAddress: string): Promise<boolean> {
  try {
    const marketplaceAddress = getMarketplaceAddress();
    if (!marketplaceAddress) return false;
    
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL_TESTNET || "https://node.ghostnet.etherlink.com"
    );
    
    const nftContract = new ethers.Contract(
      nftContractAddress,
      ["function isApprovedForAll(address owner, address operator) view returns (bool)"],
      provider
    );
    
    return await nftContract.isApprovedForAll(userAddress, marketplaceAddress);
  } catch (error) {
    console.error("Error checking marketplace approval:", error);
    return false;
  }
}

/**
 * Approve marketplace for trading using Thirdweb v5
 */
export async function approveMarketplace(
  account: Account,
  nftContractAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const marketplaceAddress = getMarketplaceAddress();
    if (!marketplaceAddress) {
      return { success: false, error: "Marketplace address not configured" };
    }

    const nftContract = getThirdwebContract({
      client,
      chain: getEtherlinkChain(),
      address: nftContractAddress,
      abi: ["function setApprovalForAll(address operator, bool approved)"] as any,
    });

    const transaction = prepareContractCall({
      contract: nftContract,
      method: "function setApprovalForAll(address operator, bool approved)",
      params: [marketplaceAddress, true],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { success: true, txHash: result.transactionHash };
  } catch (error) {
    console.error("Error approving marketplace:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Utility functions
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  
  if (remaining <= 0) return "Expired";
  
  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((remaining % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
} 