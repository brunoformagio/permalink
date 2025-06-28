"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, User, Wallet } from "lucide-react";
import { DropCard } from "@/components/drop-card";
import { Toolbar } from "@/components/toolbar";
import { WalletConnect } from "@/components/wallet-connect";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";

export default function MainPage() {
  const activeWallet = useActiveWallet();
  const isWalletConnected = !!activeWallet;

  const featuredDrop = {
    id: "1",
    title: "Digital Dreams #001",
    artist: "FromFriends™",
    price: "2.5 XTZ",
    image: "Featured Artwork Preview"
  };

  const latestDrops = [
    {
      id: "2",
      title: "Neon Nights",
      artist: "DigitalVision",
      price: "1.8 XTZ",
      image: "Artwork Preview"
    },
    {
      id: "3",
      title: "Cosmic Journey",
      artist: "SpaceArt",
      price: "3.2 XTZ",
      image: "Artwork Preview"
    },
    {
      id: "4",
      title: "Abstract Flow",
      artist: "ArtMachine",
      price: "1.2 XTZ",
      image: "Artwork Preview"
    },
    {
      id: "5",
      title: "Digital Essence",
      artist: "ByteCreator",
      price: "2.8 XTZ",
      image: "Artwork Preview"
    }
  ];

  return (
    <MainContainer>
      <Toolbar 
        title="Home"
        showBackButton={true}
        isWalletConnected={isWalletConnected}
      />

      <div className="animate-fade-in p-5 lg:px-8 pb-24">
        {/* Desktop Grid Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Wallet Connection Card - Show when wallet not connected */}
            {!isWalletConnected && (
              <div className="mb-6 lg:mb-8">
                <WalletConnect showCard={true} />
              </div>
            )}

            {/* Featured Drop Section */}
            <section className="mb-8 lg:mb-12">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-6 flex items-center">
                <TrendingUp className="mr-2 h-7 w-7" />
                Featured Drop
              </h2>
              <DropCard drop={featuredDrop} />
            </section>

            {/* Latest Drops Section */}
            <section>
              <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-6">Latest Drops</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {latestDrops.map((drop) => (
                  <DropCard key={drop.id} drop={drop} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Stats Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Platform Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Artworks</span>
                      <span className="font-medium">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Artists</span>
                      <span className="font-medium">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Volume</span>
                      <span className="font-medium">2,843 XTZ</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/create">
                        <span className="mr-2">🎨</span>
                        Create New Art
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/artist">
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </Button>
                    {isWalletConnected ? (
                      <WalletConnect triggerText="Manage Wallet" />
                    ) : (
                      <WalletConnect triggerText="Connect Wallet" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">New drop by ArtMachine</span>
                      <span className="text-xs text-muted-foreground">2m ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Cosmic Journey sold</span>
                      <span className="text-xs text-muted-foreground">5m ago</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">FromFriends™ created new art</span>
                      <span className="text-xs text-muted-foreground">1h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>


    </MainContainer>
  );
} 