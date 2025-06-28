"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shuffle, Play, Pause, Wallet, Heart, Share2 } from "lucide-react";
import { Toolbar } from "@/components/toolbar";
import { GenerativeArt } from "@/components/generative-art";
import Link from "next/link";
import { MainContainer } from "@/components/main-container";

export default function ItemPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [generation, setGeneration] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [artComponent, setArtComponent] = useState<{
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    generation: number;
    randomize: () => void;
  } | null>(null);

  const itemData = {
    title: "Digital Dreams",
    creator: "FromFriends™",
    description: "A unique algorithmic composition of flowing forms and dynamic patterns, generated through mathematical harmony. This piece explores the intersection of mathematics and art, creating endless variations of beautiful patterns.",
    attributes: [
      { label: "Attributes", value: "Legendary • Orange • Bold • 1:1" },
      { label: "Edition", value: "1 of 1" },
      { label: "Created", value: "Jun 26, 2025, 04:28 PM" },
      { label: "Blockchain", value: "Etherlink" },
      { label: "Token ID", value: "#4721" },
      { label: "Owner", value: "0x03...BA16" }
    ],
    price: "2.5 XTZ",
    history: [
      { event: "Created", price: "2.5 XTZ", from: "FromFriends™", to: "", date: "Jun 26, 2025" },
      { event: "Listed", price: "2.5 XTZ", from: "FromFriends™", to: "", date: "Jun 26, 2025" }
    ]
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRandomize = () => {
    if (artComponent) {
      artComponent.randomize();
    }
  };

  const handleMint = () => {
    alert("This is a demo. Minting is not available.");
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${itemData.title} by ${itemData.creator}`,
        text: itemData.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  // Auto-play for 3 seconds on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPlaying(true);
      
      const stopTimer = setTimeout(() => {
        setIsPlaying(false);
      }, 3000);

      return () => clearTimeout(stopTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainContainer>
      <Toolbar title="" showBackButton={true} isWalletConnected={true} />

      <div className="animate-fade-in">
        {/* Desktop Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:p-8">
          {/* Art Canvas - Takes more space on desktop */}
          <div className="lg:col-span-7">
            <div className="pb-24 lg:pb-0">
              {/* Artwork Info Header */}
              <div className="text-center lg:text-left py-6 px-5 lg:px-0 lg:mb-6">
                <h2 className="text-2xl lg:text-3xl font-bold mb-1 tracking-tight">
                  {itemData.title} #{String(generation).padStart(3, '0')}
                </h2>
                <div className="text-muted-foreground lg:text-lg">
                  Created by{' '}
                  <Link href="/artist" className="text-foreground hover:underline">
                    {itemData.creator}
                  </Link>
                </div>
              </div>

              {/* Art Canvas */}
              <div className="px-5 lg:px-0 mb-6">
                <div className="w-full max-w-sm lg:max-w-full mx-auto aspect-square bg-secondary border border-border overflow-hidden relative rounded-lg">
                  <ArtworkCanvas 
                    isPlaying={isPlaying}
                    onGenerationChange={setGeneration}
                    onComponentReady={setArtComponent}
                  />
                </div>
              </div>

              {/* Generation Info */}
              <div className="text-center lg:text-left px-5 lg:px-0 mb-6">
                <div className="text-muted-foreground text-xs lg:text-sm font-mono">
                  Generation: {generation}
                </div>
              </div>

              {/* Desktop Controls - Show controls here on desktop */}
              <div className="hidden lg:flex items-center justify-center space-x-4 px-5 lg:px-0">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRandomize}
                  className="flex items-center space-x-2"
                >
                  <Shuffle className="h-5 w-5" />
                  <span>Randomize</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePlay}
                  className="flex items-center space-x-2"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLike}
                  className={`flex items-center space-x-2 ${isLiked ? 'text-red-500' : ''}`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                  <span>Like</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleShare}
                  className="flex items-center space-x-2"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Info Panel - Right side on desktop */}
          <div className="lg:col-span-5">
            <div className="px-5 lg:px-0 space-y-6">
              {/* Description */}
              <div className="lg:block">
                <h3 className="font-semibold lg:text-lg mb-3">Description</h3>
                <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
                  {itemData.description}
                </p>
              </div>

              {/* Price and Buy Button */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Current Price</span>
                    <span className="text-2xl font-bold">{itemData.price}</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMint}
                  >
                    <Wallet className="mr-2 h-5 w-5" />
                    Buy Now
                  </Button>
                </CardContent>
              </Card>

              {/* Attributes */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Attributes</h3>
                  <div className="space-y-3">
                    {itemData.attributes.map((attr, index) => (
                      <div key={index} className="flex justify-between items-start border-b border-border pb-2 last:border-b-0 last:pb-0">
                        <span className="text-muted-foreground text-sm">{attr.label}</span>
                        <span className="text-sm font-medium text-right">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Transaction History</h3>
                  <div className="space-y-3">
                    {itemData.history.map((transaction, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{transaction.event}</span>
                        <div className="text-right">
                          <div className="font-medium">{transaction.price}</div>
                          <div className="text-xs text-muted-foreground">{transaction.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation - Only show on mobile */}
        <div className="lg:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md h-20 bg-card border-t border-border flex items-center justify-around px-5 z-50">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center min-w-15"
            onClick={handleRandomize}
          >
            <Shuffle className="h-6 w-6 mb-1" />
            <span className="text-xs">Randomize</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center min-w-15 ${isPlaying ? 'text-foreground' : ''}`}
            onClick={handlePlay}
          >
            {isPlaying ? <Pause className="h-6 w-6 mb-1" /> : <Play className="h-6 w-6 mb-1" />}
            <span className="text-xs">{isPlaying ? 'Stop' : 'Play'}</span>
          </Button>

          <Button
            className="flex flex-col items-center min-w-20 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleMint}
          >
            <Wallet className="h-5 w-5 mb-1" />
            <div className="text-xs font-semibold">Buy</div>
            <span className="text-xs opacity-90">{itemData.price}</span>
          </Button>
        </div>
      </div>
    </MainContainer>
  );
}

function ArtworkCanvas({ 
  isPlaying, 
  onGenerationChange,
  onComponentReady 
}: { 
  isPlaying: boolean;
  onGenerationChange: (generation: number) => void;
  onComponentReady: (component: { canvasRef: React.RefObject<HTMLCanvasElement | null>; generation: number; randomize: () => void; }) => void;
}) {
  const artComponent = GenerativeArt({ isPlaying, onGenerationChange });

  useEffect(() => {
    onComponentReady(artComponent);
  }, [artComponent, onComponentReady]);

  return (
    <canvas 
      ref={artComponent.canvasRef}
      className="preview-canvas"
    />
  );
} 