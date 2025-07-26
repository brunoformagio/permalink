"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { getArtworkImageData, getSeriesTokens, getArtworkSeries, getSeriesImageData } from "@/lib/contractERC721";

interface ImageDisplayProps {
  tokenId?: number;
  seriesId?: number;
  className?: string;
  alt?: string;
}

export function ImageDisplay({ 
  tokenId, 
  seriesId, 
  className = "w-full h-full", 
  alt = "Artwork"
}: ImageDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tokenId && !seriesId) {
      setError(true);
      setLoading(false);
      return;
    }

    generateImage();
  }, [tokenId, seriesId]);

  const generateImage = async () => {
    try {
      setLoading(true);
      
      let actualTokenId: number;
      
      if (tokenId) {
        // Direct token ID provided
        actualTokenId = tokenId;
      } else if (seriesId) {
        // Series ID provided - need to get a minted token from this series
        const series = await getArtworkSeries(seriesId);
        
        if (!series) {
          setError(true);
          return;
        }
        
        if (series.minted === 0) {
          // No tokens minted in this series yet - get image data directly from series!
          const seriesImageData = await getSeriesImageData(seriesId);
          if (!seriesImageData || seriesImageData.imageType === 'zip') {
            setError(true);
            return;
          }
          
          // Convert hex to bytes and create data URL
          const hexString = seriesImageData.imageData.startsWith('0x') 
            ? seriesImageData.imageData.slice(2) 
            : seriesImageData.imageData;
          const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
          const base64 = btoa(String.fromCharCode(...bytes));
          const dataUrl = `data:image/${seriesImageData.imageType};base64,${base64}`;
          
          setImageUrl(dataUrl);
          return;
        }
        
        // Get the first minted token from this series
        const seriesTokens = await getSeriesTokens(seriesId);
        
        if (!seriesTokens || seriesTokens.length === 0) {
          setError(true);
          return;
        }
        
        actualTokenId = seriesTokens[0];
      } else {
        setError(true);
        return;
      }
      
      const imageData = await getArtworkImageData(actualTokenId);
      
      if (!imageData) {
        setError(true);
        return;
      }
      
      if (imageData.imageType === 'zip') {
        setError(true);
        return;
      }

      // Convert hex to bytes
      const hexString = imageData.imageData.startsWith('0x') 
        ? imageData.imageData.slice(2) 
        : imageData.imageData;
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      
      // Create base64 data URL
      const base64 = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:image/${imageData.imageType};base64,${base64}`;
      
      setImageUrl(dataUrl);
      
    } catch (error) {
      console.error('Error generating image:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <div className="text-center text-muted-foreground">
          <div className="text-sm">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className="object-cover"
      unoptimized
    />
  );
} 