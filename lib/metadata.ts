/**
 * NFT Metadata utilities for Permalink
 * Handles OpenSea/ERC-1155 standard metadata and on-chain image storage
 */

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // base64 data URI
  external_url?: string;
  animation_url?: string;
  attributes: NFTAttribute[];
  properties?: {
    category: string;
    creator: string;
    files: Array<{
      uri: string;
      type: string;
    }>;
  };
}

/**
 * Convert a file to base64 data URI
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to convert file to base64'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (max 16KB for on-chain storage)
  const maxSize = 16 * 1024; // 16KB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 16KB for on-chain storage' };
  }
  
  // Check dimensions (optional - could be added with canvas)
  return { valid: true };
}

/**
 * Compress image if needed (basic implementation)
 */
export async function compressImage(file: File, maxSizeKB: number = 16): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions to fit within 16KB size limit
      let { width, height } = img;
      const maxDimension = 2048; // Very small dimensions for 16KB limit
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels to meet 16KB requirement
      let quality = 0.9; // Start with lower quality for 16KB target
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          // Check if size is acceptable
          if (blob.size <= maxSizeKB * 1024 || quality <= 0.05) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            quality -= 0.05; // Smaller decrements for fine-tuning
            tryCompress();
          }
        }, 'image/jpeg', quality);
      };
      
      tryCompress();
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create standard NFT metadata
 */
export function createNFTMetadata(
  tokenId: number,
  name: string,
  description: string,
  imageBase64: string,
  artistAddress: string,
  price: string,
  maxSupply: number,
  additionalAttributes: NFTAttribute[] = []
): NFTMetadata {
  const baseAttributes: NFTAttribute[] = [
    {
      trait_type: "Category",
      value: "Generative Art"
    },
    {
      trait_type: "Platform",
      value: "Permalink"
    },
    {
      trait_type: "Blockchain",
      value: "Etherlink"
    },
    {
      trait_type: "Token Standard",
      value: "ERC-1155"
    },
    {
      trait_type: "Max Supply",
      value: maxSupply
    },
    {
      trait_type: "Price (XTZ)",
      value: parseFloat(price)
    },
    {
      trait_type: "Token ID",
      value: tokenId
    },
    {
      trait_type: "Creator",
      value: `${artistAddress.slice(0, 6)}...${artistAddress.slice(-4)}`
    }
  ];

  return {
    name,
    description,
    image: imageBase64,
    external_url: `https://permalink.art/item/${tokenId}`,
    attributes: [...baseAttributes, ...additionalAttributes],
    properties: {
      category: "art",
      creator: artistAddress,
      files: [
        {
          uri: imageBase64,
          type: "image"
        }
      ]
    }
  };
}

/**
 * Convert metadata object to JSON string for on-chain storage
 */
export function metadataToJSON(metadata: NFTMetadata): string {
  return JSON.stringify(metadata, null, 2);
}

/**
 * Parse metadata JSON string back to object
 */
export function parseMetadata(metadataJSON: string): NFTMetadata | null {
  try {
    return JSON.parse(metadataJSON);
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return null;
  }
}

/**
 * Get image from metadata
 */
export function getImageFromMetadata(metadataJSON: string): string | null {
  try {
    const metadata = parseMetadata(metadataJSON);
    return metadata?.image || null;
  } catch (error) {
    console.error('Failed to extract image from metadata:', error);
    return null;
  }
}

/**
 * Create a data URI for on-chain storage
 */
export function createDataURI(metadataJSON: string): string {
  const base64 = btoa(unescape(encodeURIComponent(metadataJSON)));
  return `data:application/json;base64,${base64}`;
}

/**
 * Extract metadata from data URI
 */
export function extractFromDataURI(dataURI: string): string | null {
  try {
    if (!dataURI.startsWith('data:application/json;base64,')) {
      return null;
    }
    
    const base64 = dataURI.replace('data:application/json;base64,', '');
    return decodeURIComponent(escape(atob(base64)));
  } catch (error) {
    console.error('Failed to extract from data URI:', error);
    return null;
  }
} 