"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy } from "lucide-react";
import { Toolbar } from "@/components/toolbar";
import { DropCard } from "@/components/drop-card";

export default function ArtistPage() {
  const [copiedAddress, setCopiedAddress] = useState(false);

  const artistData = {
    name: "FromFriends™",
    address: "tz1gjaF81ZRRvdzjobyfVNsAeSC6PSc3JAJG",
    shortAddress: "tz1gja...JAJG",
    bio: "Creative developer focused on building innovative platforms that empower artists and creators in the Web3 ecosystem through thoughtful design and technology.",
    stats: {
      drops: 2,
      collected: "1.2K",
      followers: "890",
      following: "123"
    }
  };

  const drops = [
    {
      id: "1",
      title: "Digital Dreams #001",
      artist: "Created",
      price: "2.5 XTZ",
      image: "Artist Creation #1"
    },
    {
      id: "2",
      title: "Future Visions",
      artist: "Created",
      price: "1.9 XTZ",
      image: "Artist Creation #2"
    },
    {
      id: "3",
      title: "Neon Abstracts",
      artist: "Created",
      price: "3.1 XTZ",
      image: "Artist Creation #3"
    },
    {
      id: "4",
      title: "Generative Flows",
      artist: "Created",
      price: "2.2 XTZ",
      image: "Artist Creation #4"
    }
  ];

  const collected = [
    {
      id: "5",
      title: "Rare Collection #007",
      artist: "Collected",
      price: "",
      image: "Collected Item #1"
    },
    {
      id: "6",
      title: "Abstract Essence #12",
      artist: "Collected",
      price: "",
      image: "Collected Item #2"
    }
  ];

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(artistData.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="container-responsive">
      <Toolbar title="FromFriends™" showBackButton={true} isWalletConnected={true} />

      <div className="animate-fade-in">
        {/* Desktop Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:p-8">
          {/* Artist Header - Spans full width on mobile, left column on desktop */}
          <div className="lg:col-span-4">
            <div className="text-center lg:text-left py-8 px-5 lg:px-0 border-b lg:border-b-0 border-border">
              <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-full bg-muted mx-auto lg:mx-0 mb-4 lg:mb-6" />
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">{artistData.name}</h1>
              
              <div className="inline-flex items-center bg-secondary text-muted-foreground px-3 py-2 rounded-lg text-sm font-mono mb-4 lg:mb-6">
                <span>{artistData.shortAddress}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-3 p-0 h-auto text-muted-foreground hover:text-foreground"
                  onClick={copyAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-muted-foreground text-sm lg:text-base mb-6 lg:mb-8 leading-relaxed">
                {artistData.bio}
              </p>

              {/* Stats - Grid layout on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="text-center lg:text-left">
                  <div className="text-xl lg:text-2xl font-bold">{artistData.stats.drops}</div>
                  <div className="text-muted-foreground text-xs lg:text-sm">Drops</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl lg:text-2xl font-bold">{artistData.stats.collected}</div>
                  <div className="text-muted-foreground text-xs lg:text-sm">Collected</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl lg:text-2xl font-bold">{artistData.stats.followers}</div>
                  <div className="text-muted-foreground text-xs lg:text-sm">Followers</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl lg:text-2xl font-bold">{artistData.stats.following}</div>
                  <div className="text-muted-foreground text-xs lg:text-sm">Following</div>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden lg:block mt-8 space-y-3">
                <Button className="w-full">Follow Artist</Button>
                <Button variant="outline" className="w-full">Share Profile</Button>
              </div>
            </div>
          </div>

          {/* Content Area - Right side on desktop */}
          <div className="lg:col-span-8">
            <div className="px-5 lg:px-0 py-6 lg:py-0">
              <Tabs defaultValue="drops" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:mb-8">
                  <TabsTrigger value="drops" className="lg:text-base">Drops</TabsTrigger>
                  <TabsTrigger value="collected" className="lg:text-base">Collected</TabsTrigger>
                </TabsList>
                
                <TabsContent value="drops" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {drops.map((drop) => (
                      <DropCard key={drop.id} drop={drop} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="collected" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {collected.map((item) => (
                      <DropCard key={item.id} drop={item} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons - Only show on mobile */}
        <div className="lg:hidden px-5 pb-8 space-y-3">
          <Button className="w-full">Follow Artist</Button>
          <Button variant="outline" className="w-full">Share Profile</Button>
        </div>
      </div>

      {copiedAddress && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border px-4 py-2 rounded-lg text-sm z-50">
          Address copied to clipboard!
        </div>
      )}
    </div>
  );
} 