"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Play } from "lucide-react";
import Link from "next/link";

interface Drop {
  id: string;
  title: string;
  artist: string;
  price: string;
  image: string; // Can be text description or actual image URI
  imageUri?: string; // Actual image URI for display
  supply?: string; // Optional supply information
  isZip?: boolean; // Whether this is a zip file (generative art)
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
          <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground cursor-pointer overflow-hidden">
            {drop.isZip ? (
              <div className="text-center p-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Archive className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-sm font-medium text-purple-600">Generative Art</div>
                <div className="text-xs mt-1 opacity-75 flex items-center justify-center gap-1">
                  <Play className="h-3 w-3" />
                  Interactive
                </div>
              </div>
            ) : drop.imageUri ? (
              <img 
                src={drop.imageUri} 
                alt={drop.title}
                className="w-full h-full object-cover"
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
          <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground cursor-pointer overflow-hidden">
            {drop.isZip ? (
              <div className="text-center p-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Archive className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-sm font-medium text-purple-600">Generative Art</div>
                <div className="text-xs mt-1 opacity-75 flex items-center justify-center gap-1">
                  <Play className="h-3 w-3" />
                  Interactive
                </div>
              </div>
            ) : drop.imageUri ? (
              <img 
                src={drop.imageUri} 
                alt={drop.title}
                className="w-full h-full object-cover"
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