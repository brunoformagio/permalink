import { ethers } from "ethers";
import { createThirdwebClient, getContract as getThirdwebContract, prepareContractCall, sendTransaction } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import type { Account, Wallet } from "thirdweb/wallets";
import { extractFromDataURI, parseMetadata, getImageFromMetadata } from "./metadata";

// Import the compiled ABI for accurate function signatures
import PermalinkABI from "../artifacts/contracts/Permalink.sol/Permalink.json";

// Use the compiled ABI for maximum compatibility
const PERMALINK_ABI = PermalinkABI.abi;

// Contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET;

if (!CONTRACT_ADDRESS) {
  console.warn("Contract address not found in environment variables");
}

// Thirdweb client setup
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Etherlink Testnet chain definition
const etherlinkTestnet = defineChain({
  id: 128123,
  name: "Etherlink Testnet",
  nativeCurrency: {
    name: "Tezos",
    symbol: "XTZ",
    decimals: 18,
  },
  rpc: "https://node.ghostnet.etherlink.com",
  blockExplorers: [
    {
      name: "Etherlink Explorer",
      url: "https://testnet.explorer.etherlink.com",
    },
  ],
  testnet: true,
});

// Get thirdweb contract instance
function getThirdwebContractInstance() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  
  return getThirdwebContract({
    client,
    chain: etherlinkTestnet,
    address: CONTRACT_ADDRESS,
    abi: PERMALINK_ABI as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });
}

// Types
export interface ArtistProfile {
  artistName: string;
  bio: string;
  avatarURI: string;
  totalCreated: number;
  totalCollected: number;
  isRegistered: boolean;
}

export interface Artwork {
  tokenId: number;
  artist: string;
  title: string;
  description: string;
  metadataURI: string;
  metadata?: import('@/lib/metadata').NFTMetadata; // Parsed metadata
  imageUri?: string; // Extracted image for display
  price: string; // in ETH
  maxSupply: number;
  currentSupply: number;
  isActive: boolean;
  createdAt: number;
}

export interface ContractError extends Error {
  code?: string;
  reason?: string;
}

/**
 * Get a read-only contract instance
 */
export function getContract(provider?: ethers.Provider) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  
  // Use provided provider or create a default one
  const rpcProvider = provider || new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_ETHERLINK_RPC_URL_TESTNET || "https://node.ghostnet.etherlink.com"
  );
  
  return new ethers.Contract(CONTRACT_ADDRESS, PERMALINK_ABI, rpcProvider);
}

/**
 * Get a contract instance for writing (requires signer)
 */
export function getContractWithSigner(signer: ethers.Signer) {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  
  return new ethers.Contract(CONTRACT_ADDRESS, PERMALINK_ABI, signer);
}

/**
 * Get artist profile by address
 */
export async function getArtistProfile(address: string): Promise<ArtistProfile | null> {
  try {
    const contract = getContract();
    const result = await contract.getArtistProfile(address);
    
    // If artist is not registered, return null
    if (!result.isRegistered) {
      return null;
    }
    
    return {
      artistName: result.artistName || "NO_NAME",
      bio: result.bio || "NO_BIO",
      avatarURI: result.avatarURI || "",
      totalCreated: Number(result.totalCreated),
      totalCollected: Number(result.totalCollected),
      isRegistered: result.isRegistered
    };
  } catch (error) {
    console.error("Error fetching artist profile:", error);
    return null;
  }
}

/**
 * Get artwork by token ID
 */
export async function getArtwork(tokenId: number): Promise<Artwork | null> {
  try {
    const contract = getContract();
    const result = await contract.getArtwork(tokenId);
    
    // Parse metadata if it's a data URI (on-chain metadata)
    let metadata: import('@/lib/metadata').NFTMetadata | undefined;
    let imageUri: string | undefined;
    
    if (result.metadataURI) {
      if (result.metadataURI.startsWith('data:application/json;base64,')) {
        // On-chain metadata
        const metadataJSON = extractFromDataURI(result.metadataURI);
        if (metadataJSON) {
          metadata = parseMetadata(metadataJSON) || undefined;
          imageUri = metadata?.image;
        }
      } else {
        // Legacy metadata - try to extract image
        imageUri = getImageFromMetadata(result.metadataURI) || undefined;
      }
    }
    
    return {
      tokenId,
      artist: result.artist,
      title: result.title,
      description: result.description,
      metadataURI: result.metadataURI,
      metadata,
      imageUri,
      price: ethers.formatEther(result.price),
      maxSupply: Number(result.maxSupply),
      currentSupply: Number(result.currentSupply),
      isActive: result.isActive,
      createdAt: Number(result.createdAt)
    };
  } catch (error) {
    console.error(`Error fetching artwork ${tokenId}:`, error);
    return null;
  }
}

/**
 * Get all artworks created by an artist
 */
export async function getArtistArtworks(address: string): Promise<Artwork[]> {
  try {
    const contract = getContract();
    const tokenIds = await contract.getArtistTokens(address);
    
    const artworks = await Promise.all(
      tokenIds.map(async (tokenId: bigint) => {
        return await getArtwork(Number(tokenId));
      })
    );
    
    return artworks.filter((artwork: Artwork | null): artwork is Artwork => artwork !== null);
  } catch (error) {
    console.error("Error fetching artist artworks:", error);
    return [];
  }
}

/**
 * Get all artworks collected by a user
 */
export async function getCollectedArtworks(address: string): Promise<Artwork[]> {
  try {
    const contract = getContract();
    const tokenIds = await contract.getCollectorTokens(address);
    
    const artworks = await Promise.all(
      tokenIds.map(async (tokenId: bigint) => {
        return await getArtwork(Number(tokenId));
      })
    );
    
    return artworks.filter((artwork: Artwork | null): artwork is Artwork => artwork !== null);
  } catch (error) {
    console.error("Error fetching collected artworks:", error);
    return [];
  }
}

/**
 * Get the current total number of tokens minted
 */
export async function getCurrentTokenId(): Promise<number> {
  try {
    const contract = getContract();
    const currentId = await contract.getCurrentTokenId();
    return Number(currentId);
  } catch (error) {
    console.error("Error fetching current token ID:", error);
    return 0;
  }
}

/**
 * Get user's balance of a specific token
 */
export async function getUserTokenBalance(userAddress: string, tokenId: number): Promise<number> {
  try {
    const contract = getContract();
    const balance = await contract.balanceOf(userAddress, tokenId);
    return Number(balance);
  } catch (error) {
    console.error(`Error fetching balance for token ${tokenId}:`, error);
    return 0;
  }
}

/**
 * Update artist profile (requires wallet connection)
 */
export async function updateArtistProfile(
  signer: ethers.Signer,
  name: string,
  bio: string,
  avatarURI: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getContractWithSigner(signer);
    const tx = await contract.updateArtistProfile(name, bio, avatarURI);
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    const contractError = error as ContractError;
    return { 
      success: false, 
      error: contractError.reason || contractError.message || "Transaction failed" 
    };
  }
}

/**
 * Mint new artwork (requires wallet connection)
 */
export async function mintArtwork(
  signer: ethers.Signer,
  title: string,
  description: string,
  metadataURI: string,
  priceInEth: string,
  maxSupply: number
): Promise<{ success: boolean; tokenId?: number; txHash?: string; error?: string }> {
  try {
    const contract = getContractWithSigner(signer);
    const priceInWei = ethers.parseEther(priceInEth);
    
    const tx = await contract.mintArtwork(title, description, metadataURI, priceInWei, maxSupply);
    const receipt = await tx.wait();
    
    // Get the token ID from the event
    const event = receipt.logs.find((log: { topics: readonly string[]; data: string; }) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'ArtworkMinted';
      } catch {
        return false;
      }
    });
    
    let tokenId: number | undefined;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      tokenId = Number(parsed?.args?.tokenId);
    }
    
    return { success: true, tokenId, txHash: tx.hash };
  } catch (error) {
    const contractError = error as ContractError;
    return { 
      success: false, 
      error: contractError.reason || contractError.message || "Minting failed" 
    };
  }
}

/**
 * Purchase artwork (requires wallet connection)
 */
export async function purchaseArtwork(
  signer: ethers.Signer,
  tokenId: number,
  amount: number,
  totalPriceInEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getContractWithSigner(signer);
    const valueInWei = ethers.parseEther(totalPriceInEth);
    
    const tx = await contract.purchaseArtwork(tokenId, amount, { value: valueInWei });
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    const contractError = error as ContractError;
    return { 
      success: false, 
      error: contractError.reason || contractError.message || "Purchase failed" 
    };
  }
}

/**
 * Utility function to format Ethereum addresses
 */
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Utility function to validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Utility function to format date from timestamp
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

// =============================================================================
// THIRDWEB V5 INTEGRATION FUNCTIONS
// =============================================================================

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
    const contract = getThirdwebContractInstance();
    
    const transaction = prepareContractCall({
      contract,
      method: "function updateArtistProfile(string _name, string _bio, string _avatarURI)",
      params: [name, bio, avatarURI],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { 
      success: true, 
      txHash: result.transactionHash 
    };
  } catch (error: unknown) {
    console.error("Profile update error:", error);
    
    // Handle common error types
    let errorMessage = "Transaction failed";
    const errorObj = error as { message?: string };
    
    if (errorObj?.message?.includes("rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorObj?.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for transaction";
    } else if (errorObj?.message?.includes("gas")) {
      errorMessage = "Transaction failed due to gas issues";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Mint artwork using thirdweb v5
 */
export async function mintArtworkV5(
  account: Account,
  title: string,
  description: string,
  metadataURI: string,
  priceInEth: string,
  maxSupply: number
): Promise<{ success: boolean; tokenId?: number; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebContractInstance();
    const priceInWei = ethers.parseEther(priceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function mintArtwork(string _title, string _description, string _metadataURI, uint256 _price, uint256 _maxSupply) returns (uint256)",
      params: [title, description, metadataURI, priceInWei, BigInt(maxSupply)],
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    // Note: Getting tokenId from events in thirdweb v5 might require additional steps
    // For now, we'll return success without tokenId
    return { 
      success: true, 
      txHash: result.transactionHash 
    };
  } catch (error: unknown) {
    console.error("Minting error:", error);
    
    let errorMessage = "Minting failed";
    const errorObj = error as { message?: string };
    
    if (errorObj?.message?.includes("rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorObj?.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for transaction";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Purchase artwork using thirdweb v5
 */
export async function purchaseArtworkV5(
  account: Account,
  tokenId: number,
  amount: number,
  totalPriceInEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getThirdwebContractInstance();
    const totalPriceInWei = ethers.parseEther(totalPriceInEth);
    
    const transaction = prepareContractCall({
      contract,
      method: "function purchaseArtwork(uint256 tokenId, uint256 amount) payable",
      params: [BigInt(tokenId), BigInt(amount)],
      value: totalPriceInWei,
    });

    const result = await sendTransaction({
      transaction,
      account,
    });

    return { 
      success: true, 
      txHash: result.transactionHash 
    };
  } catch (error: unknown) {
    console.error("Purchase error:", error);
    
    let errorMessage = "Purchase failed";
    const errorObj = error as { message?: string };
    
    if (errorObj?.message?.includes("rejected")) {
      errorMessage = "Transaction was rejected by user";
    } else if (errorObj?.message?.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for purchase";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Helper function to get account from thirdweb wallet
 */
export function getAccountFromWallet(wallet: Wallet): Account | null {
  try {
    const account = wallet.getAccount();
    return account || null;
  } catch (error) {
    console.error("Error getting account from wallet:", error);
    return null;
  }
} 