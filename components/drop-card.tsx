"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Drop {
  id: string;
  title: string;
  artist: string;
  price: string;
  image: string;
  supply?: string; // Optional supply information
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
          <div className="w-full h-48 bg-[#222] text-[#666] flex items-center justify-center text-muted-foreground cursor-pointer">
            {drop.image}
          </div>
        </div>
      ) : (
        <Link href={`/item/${drop.id}`}>
          <div className="w-full h-48 bg-[#222] text-[#666] flex items-center justify-center text-muted-foreground cursor-pointer">
            {drop.image}
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