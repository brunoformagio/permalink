"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GenerativeThumbnail } from "@/components/generative-thumbnail";
import { ImageDisplay } from "@/components/image-display";

interface Drop {
  id: string;
  title: string;
  artist: string;
  price: string;
  image: string; // Can be text description or actual image URI
  imageUri?: string; // Actual image URI for display
  supply?: string; // Optional supply information
  isZip?: boolean; // Whether this is a zip file (generative art)
  tokenId?: number; // For individual NFTs
  seriesId?: number; // For series
}

interface DropCardProps {
  drop: Drop;
  onClick?: () => void; // Optional click handler for custom routing
}

export function DropCard({ drop, onClick }: DropCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card className="overflow-hidden transition-transform hover:-translate-y-1">
      {onClick ? (
        <div onClick={handleCardClick}>
          <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground cursor-pointer overflow-hidden relative">
            {drop.isZip ? (
              <GenerativeThumbnail 
                tokenId={drop.tokenId}
                seriesId={drop.seriesId}
                className="w-full h-full"
                size={300}
              />
            ) : drop.imageUri ? (
              <Image
                unoptimized={true}
                src={drop.imageUri} 
                alt={drop.title}
                width={100}
                height={100}
                className="w-full h-full object-cover"
              />
            ) : (drop.tokenId || drop.seriesId) ? (
              <ImageDisplay
                tokenId={drop.tokenId}
                seriesId={drop.seriesId}
                className="w-full h-full"
                alt={drop.title}
              />
            ) : (
              <div className="text-center p-4">
                <div className="text-sm font-medium">{drop.title}</div>
                <div className="text-xs mt-1 opacity-75">{drop.image}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Link href={`/item/${drop.id}`}>
          <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground cursor-pointer overflow-hidden relative">
            {drop.isZip ? (
              <GenerativeThumbnail 
                tokenId={drop.tokenId}
                seriesId={drop.seriesId}
                className="w-full h-full"
                size={300}
              />
            ) : drop.imageUri ? (
              <Image
                unoptimized={true}
                src={drop.imageUri} 
                alt={drop.title}
                width={100}
                height={100}
                className="w-full h-full object-cover"
              />
            ) : (drop.tokenId || drop.seriesId) ? (
              <ImageDisplay
                tokenId={drop.tokenId}
                seriesId={drop.seriesId}
                className="w-full h-full"
                alt={drop.title}
              />
            ) : (
              <div className="text-center p-4">
                <div className="text-sm font-medium">{drop.title}</div>
                <div className="text-xs mt-1 opacity-75">{drop.image}</div>
              </div>
            )}
          </div>
        </Link>
      )}
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2">{drop.title}</h3>
        <p className="text-muted-foreground text-sm mb-3">by {drop.artist}</p>
        {drop.supply && (
          <p className="text-muted-foreground text-xs mb-2">{drop.supply}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{drop.price}</span>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/item/${drop.id}`}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 