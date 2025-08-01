"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, User, RefreshCw } from "lucide-react";
import { DropCard } from "@/components/drop-card";
import { Toolbar } from "@/components/toolbar";
import { WalletConnect } from "@/components/wallet-connect";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";
import { toast } from "sonner";
import { 
  getCurrentSeriesId, 
  getArtworkSeries, 
  type ArtworkSeries 
} from "@/lib/contractERC721";

export function MainPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWallet = useActiveWallet();
  const isWalletConnected = !!activeWallet;

  const [featuredArtwork, setFeaturedArtwork] = useState<ArtworkSeries | null>(null);
  const [latestArtworks, setLatestArtworks] = useState<ArtworkSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalArtworks, setTotalArtworks] = useState(0);

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      
      // Get the current series ID to know how many artwork series exist
      const currentId = await getCurrentSeriesId();
      setTotalArtworks(currentId);
      
      if (currentId === 0) {
        setFeaturedArtwork(null);
        setLatestArtworks([]);
        return;
      }

      // Fetch the latest artwork series (last 5)
      const artworkPromises = [];
      const start = Math.max(1, currentId - 4); // Get last 5 series
      
      for (let i = currentId; i >= start; i--) {
        artworkPromises.push(getArtworkSeries(i));
      }
      
      const artworks = await Promise.all(artworkPromises);
      const validArtworks = artworks.filter((artwork): artwork is ArtworkSeries => 
        artwork !== null && artwork.isActive
      );
      
      // Set featured artwork (most recent)
      if (validArtworks.length > 0) {
        setFeaturedArtwork(validArtworks[0]);
        setLatestArtworks(validArtworks.slice(1));
      }

    } catch (error) {
      console.error("Error fetching artworks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, []);

  // Handle refresh parameter from URL (e.g. when redirected from minting)
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    
    if (refreshParam === 'true') {
      toast.loading("Refreshing artwork gallery...", {
        id: "auto-refresh"
      });
      
      setTimeout(async () => {
        setRefreshing(true);
        await fetchArtworks();
        
        toast.success("Gallery updated with latest artworks!", {
          id: "auto-refresh"
        });
        
        // Clean up the URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('refresh');
        router.replace(newUrl.pathname, { scroll: false });
      }, 1000); // Small delay to let the page load
    }
  }, [searchParams, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchArtworks();
  };

  const navigateToItem = (seriesId: number) => {
    router.push(`/item/series-${seriesId}`);
  };

  const navigateToArtist = () => {
    // Use the redirect route which will handle wallet checks
    router.push('/artist');
  };

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

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading artworks from blockchain...</p>
              </div>
            )}

            {/* No Artworks State */}
            {!loading && totalArtworks === 0 && (
              <div className="text-center py-12">
                <div className="mb-4">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Artwork Series Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Be the first to create an artwork series on Permalink!
                  </p>
                  <Button asChild variant="gradient">
                    <Link href="/create" className="!text-white">Create First Series</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Featured Drop Section */}
            {!loading && featuredArtwork && (
              <section className="mb-8 lg:mb-12">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <h2 className="text-2xl lg:text-3xl font-bold flex items-center">
                    <TrendingUp className="mr-2 h-7 w-7" />
                    Featured Drop
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <DropCard 
                  drop={{
                    id: `series-${totalArtworks}`,
                    title: featuredArtwork.title,
                    artist: `${featuredArtwork.artist.slice(0, 6)}...${featuredArtwork.artist.slice(-4)}`,
                    price: `${featuredArtwork.price} XTZ`,
                    image: featuredArtwork.description || `Series #${totalArtworks}`,
                    imageUri: '', // On-chain storage - no external URI
                    supply: `${featuredArtwork.minted}/${featuredArtwork.maxSupply} minted`,
                    isZip: featuredArtwork.imageType === 'zip',
                    seriesId: totalArtworks
                  }}
                  onClick={() => navigateToItem(totalArtworks)}
                />
              </section>
            )}

            {/* Latest Drops Section */}
            {!loading && latestArtworks.length > 0 && (
              <section>
                <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-6">Latest Drops</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {latestArtworks.map((artwork, index) => {
                    const seriesId = totalArtworks - index - 1; // Calculate series ID based on position
                    return (
                      <DropCard 
                        key={seriesId}
                        drop={{
                          id: `series-${seriesId}`,
                          title: artwork.title,
                          artist: `${artwork.artist.slice(0, 6)}...${artwork.artist.slice(-4)}`,
                          price: `${artwork.price} XTZ`,
                          image: artwork.description || `Series #${seriesId}`,
                          imageUri: '', // On-chain storage - no external URI
                          supply: `${artwork.minted}/${artwork.maxSupply} minted`,
                          isZip: artwork.imageType === 'zip',
                          seriesId: seriesId
                        }}
                        onClick={() => navigateToItem(seriesId)}
                      />
                    );
                  })}
                </div>
              </section>
            )}
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
                      <span className="text-muted-foreground">Total Series</span>
                      <span className="font-medium">{totalArtworks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Featured Series</span>
                      <span className="font-medium">
                        {featuredArtwork ? `#${totalArtworks}` : 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latest Drops</span>
                      <span className="font-medium">{latestArtworks.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span className="font-medium">Etherlink</span>
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
                        Create New Series
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={navigateToArtist}
                    >
                      <User className="mr-2 h-4 w-4" />
                      View My Profile
                    </Button>
                    {isWalletConnected ? (
                      <WalletConnect triggerText="Manage Wallet" />
                    ) : (
                      <WalletConnect triggerText="Connect Wallet" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contract Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Smart Contract</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract</span>
                      <span className="font-mono text-xs">
                        {process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET 
                          ? `${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET.slice(0, 6)}...${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET.slice(-4)}`
                          : "Not configured"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span>Etherlink Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Standard</span>
                      <span>ERC-721</span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      All data is fetched directly from the blockchain
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {featuredArtwork && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Latest Activity</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          &quot;{featuredArtwork.title}&quot; created
                        </span>
                        <span className="text-xs text-muted-foreground">Latest</span>
                      </div>
                      {latestArtworks.slice(0, 2).map((artwork, index) => (
                        <div key={totalArtworks - index - 1} className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            &quot;{artwork.title}&quot; {artwork.minted > 0 ? 'sold' : 'listed'}
                          </span>
                          <span className="text-xs text-muted-foreground">Recent</span>
                        </div>
                      ))}
                      {totalArtworks === 0 && (
                        <div className="text-center text-muted-foreground py-2">
                          No activity yet. Be the first to create!
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainContainer>
  );
} 