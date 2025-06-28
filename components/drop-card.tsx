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
}

interface DropCardProps {
  drop: Drop;
}

export function DropCard({ drop }: DropCardProps) {
  return (
    <Card className="overflow-hidden transition-transform hover:-translate-y-1">
      <Link href="/item">
        <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground cursor-pointer">
          {drop.image}
        </div>
      </Link>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-2">{drop.title}</h3>
        <p className="text-muted-foreground text-sm mb-3">by {drop.artist}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{drop.price}</span>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/item">Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 