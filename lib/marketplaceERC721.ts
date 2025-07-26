import { ethers } from "ethers";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { client, etherlinkChain } from "./thirdweb";

// Get environment configuration
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "testnet";

// Contract addresses using existing environment pattern
const MARKETPLACE_CONTRACT_ADDRESS = environment === "mainnet" 
  ? process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_MAINNET || ""
  : environment === "localhost"
  ? process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_LOCALHOST || ""
  : process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET || "";

const PERMALINK_CONTRACT_ADDRESS = environment === "mainnet" 
  ? process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_MAINNET || ""
  : environment === "localhost"
  ? process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_LOCALHOST || ""
  : process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET || "";

// ERC-721 Marketplace ABI (simplified for key functions)
const MarketplaceERC721ABI = [
  "function createListing(uint256 tokenId, uint256 price) returns (bytes32)",
  "function cancelListing(bytes32 listingId)",
  "function buyFromListing(bytes32 listingId) payable",
  "function makeOffer(uint256 tokenId, uint256 duration) payable returns (bytes32)",
  "function acceptOffer(bytes32 offerId)",
  "function cancelOffer(bytes32 offerId)",
  "function getTokenListings(uint256 tokenId) view returns (bytes32[])",
  "function getTokenOffers(uint256 tokenId) view returns (bytes32[])",
  "function marketplaceFee() view returns (uint256)",
  "function listings(bytes32) view returns (uint256 tokenId, uint256 price, address seller, uint256 listedAt, bool isActive)",
  "function offers(bytes32) view returns (uint256 tokenId, uint256 price, address buyer, uint256 expiresAt, bool isActive)"
];

// ERC-721 NFT ABI (for approvals)
const ERC721ABI = [
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// Types for ERC-721 marketplace
export interface ListingERC721 {
  listingId: string;
  tokenId: number;
  price: string; // in ETH
  seller: string;
  listedAt: number;
  isActive: boolean;
}

export interface OfferERC721 {
  offerId: string;
  tokenId: number;
  price: string; // in ETH
  buyer: string;
  expiresAt: number;
  isActive: boolean;
}

/**
 * Get marketplace contract instance
 */
function getMarketplaceContract() {
  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error("Marketplace address not configured");
  }
  
  return getContract({
    client,
    chain: etherlinkChain,
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MarketplaceERC721ABI as any,
  });
}

/**
 * Get NFT contract instance
 */
function getNFTContract() {
  if (!PERMALINK_CONTRACT_ADDRESS) {
    throw new Error("Permalink contract address not configured");
  }
  
  return getContract({
    client,
    chain: etherlinkChain,
    address: PERMALINK_CONTRACT_ADDRESS,
    abi: ERC721ABI as any,
  });
}

/**
 * Check if marketplace is approved for a specific token
 */
export async function isMarketplaceApprovedERC721(userAddress: string, tokenId: number): Promise<boolean> {
  try {
    if (!MARKETPLACE_CONTRACT_ADDRESS || !PERMALINK_CONTRACT_ADDRESS) {
      console.warn("Contract addresses not configured");
      return false;
    }

    const nftContract = getNFTContract();
    
    // Check if user owns the token first
    const owner = await readContract({
      contract: nftContract,
      method: "function ownerOf(uint256 tokenId) view returns (address)",
      params: [BigInt(tokenId)]
    });

    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      return false; // User doesn't own the token
    }

    // Check specific token approval
    const approvedAddress = await readContract({
      contract: nftContract,
      method: "function getApproved(uint256 tokenId) view returns (address)",
      params: [BigInt(tokenId)]
    });

    if (approvedAddress.toLowerCase() === MARKETPLACE_CONTRACT_ADDRESS.toLowerCase()) {
      return true;
    }

    // Check approval for all
    const isApprovedForAll = await readContract({
      contract: nftContract,
      method: "function isApprovedForAll(address owner, address operator) view returns (bool)",
      params: [userAddress as `0x${string}`, MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`]
    });

    return isApprovedForAll;
  } catch (error) {
    console.error("Error checking marketplace approval:", error);
    return false;
  }
}

/**
 * Approve marketplace for a specific token or all tokens
 */
export async function approveMarketplaceERC721(
  account: Account,
  tokenId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    console.log("approveMarketplaceERC721", tokenId);
  try {
    if (!MARKETPLACE_CONTRACT_ADDRESS) {
      return { success: false, error: "Marketplace address not configured" };
    }

    const nftContract = getNFTContract();
    
    // Use setApprovalForAll for better UX (approve all tokens at once)
    const transaction = prepareContractCall({
      contract: nftContract,
      method: "function setApprovalForAll(address operator, bool approved)",
      params: [MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`, true],
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

/**
 * Create a listing for an ERC-721 token
 */
export async function createListingERC721(
  account: Account,
  tokenId: number,
  priceInEth: string
): Promise<{ success: boolean; listingId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
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
 * Buy from a listing
 */
export async function buyFromListingERC721(
  account: Account,
  listingId: string,
  priceInEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
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
export async function makeOfferERC721(
  account: Account,
  tokenId: number,
  offerPriceInEth: string,
  durationInDays: number
): Promise<{ success: boolean; offerId?: string; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
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

/**
 * Get listings for a token
 */
export async function getTokenListingsERC721(tokenId: number): Promise<ListingERC721[]> {
  try {
    const contract = getMarketplaceContract();
    
    // Get listing IDs
    const listingIds = await readContract({
      contract,
      method: "function getTokenListings(uint256 tokenId) view returns (bytes32[])",
      params: [BigInt(tokenId)]
    });

    const listings: ListingERC721[] = [];
    
    for (const listingId of listingIds) {
      try {
        const listingData = await readContract({
          contract,
          method: "function listings(bytes32) view returns (uint256 tokenId, uint256 price, address seller, uint256 listedAt, bool isActive)",
          params: [listingId]
        });

        if (listingData[4]) { // isActive
          listings.push({
            listingId: listingId,
            tokenId: Number(listingData[0]),
            price: ethers.formatEther(listingData[1]),
            seller: listingData[2],
            listedAt: Number(listingData[3]),
            isActive: listingData[4]
          });
        }
      } catch (error) {
        console.error(`Error fetching listing ${listingId}:`, error);
      }
    }

    return listings.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } catch (error) {
    console.error("Error getting token listings:", error);
    return [];
  }
}

/**
 * Get offers for a token
 */
export async function getTokenOffersERC721(tokenId: number): Promise<OfferERC721[]> {
  try {
    const contract = getMarketplaceContract();
    
    // Get offer IDs
    const offerIds = await readContract({
      contract,
      method: "function getTokenOffers(uint256 tokenId) view returns (bytes32[])",
      params: [BigInt(tokenId)]
    });

    const offers: OfferERC721[] = [];
    
    for (const offerId of offerIds) {
      try {
        const offerData = await readContract({
          contract,
          method: "function offers(bytes32) view returns (uint256 tokenId, uint256 price, address buyer, uint256 expiresAt, bool isActive)",
          params: [offerId]
        });

        if (offerData[4] && Number(offerData[3]) > Date.now() / 1000) { // isActive and not expired
          offers.push({
            offerId: offerId,
            tokenId: Number(offerData[0]),
            price: ethers.formatEther(offerData[1]),
            buyer: offerData[2],
            expiresAt: Number(offerData[3]),
            isActive: offerData[4]
          });
        }
      } catch (error) {
        console.error(`Error fetching offer ${offerId}:`, error);
      }
    }

    return offers.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  } catch (error) {
    console.error("Error getting token offers:", error);
    return [];
  }
}

/**
 * Format time remaining until expiration
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = expiresAt - now;
  
  if (timeLeft <= 0) {
    return "Expired";
  }
  
  const days = Math.floor(timeLeft / (24 * 60 * 60));
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Cancel a listing
 */
export async function cancelListingERC721(
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
    console.error("Error canceling listing:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Cancel an offer
 */
export async function cancelOfferERC721(
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
    console.error("Error canceling offer:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Accept an offer
 */
export async function acceptOfferERC721(
  account: Account,
  offerId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getMarketplaceContract();
    
    const transaction = prepareContractCall({
      contract,
      method: "function acceptOffer(bytes32 offerId)",
      params: [offerId as `0x${string}`],
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