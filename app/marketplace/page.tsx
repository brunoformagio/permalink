"use client";

import { useState, useEffect } from "react";
import { useActiveWallet } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  ShoppingCart,
  Clock,
  Tag,
  User,
  Archive,
  Loader2
} from "lucide-react";
import { getArtwork, getCurrentTokenId, formatAddress, formatDate } from "@/lib/contract";
import { WhitelistGuard } from "@/components/whitelist-guard";
import { DropCard } from "@/components/drop-card";
import { toast } from "sonner";
import Image from "next/image";

interface MarketplaceItem {
  tokenId: number;
  title: string;
  artist: string;
  imageUri?: string;
  imageType: string;
  currentPrice?: string;
  listingType: 'listing' | 'offer' | 'primary';
  amount?: number;
  seller?: string;
  buyer?: string;
  expiresAt?: number;
}

export default function MarketplacePage() {
  const router = useRouter();
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;

  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  const loadMarketplaceItems = async () => {
    try {
      setLoading(true);
      
      // Get all artworks first
      const currentTokenId = await getCurrentTokenId();
      const items: MarketplaceItem[] = [];
      
      // Load all artworks
      for (let i = 1; i <= currentTokenId; i++) {
        try {
          const artwork = await getArtwork(i);
          if (artwork && artwork.isActive) {
            // Add as primary sale if still available
            if (artwork.currentSupply < artwork.maxSupply) {
              items.push({
                tokenId: i,
                title: artwork.title,
                artist: artwork.artist,
                imageUri: artwork.imageUri,
                imageType: artwork.imageType,
                currentPrice: artwork.price,
                listingType: 'primary',
                amount: artwork.maxSupply - artwork.currentSupply
              });
            }
          }
        } catch (error) {
          console.error(`Error loading artwork ${i}:`, error);
        }
      }

      // TODO: Load actual marketplace listings and offers
      // This would use the marketplace contract to get all active listings/offers
      
      setItems(items);
    } catch (error) {
      console.error("Error loading marketplace items:", error);
      toast.error("Failed to load marketplace items");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         formatAddress(item.artist).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || item.listingType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.currentPrice || "0") - parseFloat(b.currentPrice || "0");
      case "price-high":
        return parseFloat(b.currentPrice || "0") - parseFloat(a.currentPrice || "0");
      case "recent":
      default:
        return b.tokenId - a.tokenId;
    }
  });

  if (loading) {
    return (
      <WhitelistGuard>
        <MainContainer>
          <Toolbar title="Marketplace" showBackButton={true} isWalletConnected={!!currentUserAddress} />
          <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading marketplace...</p>
            </div>
          </div>
        </MainContainer>
      </WhitelistGuard>
    );
  }

  return (
    <WhitelistGuard>
      <MainContainer>
        <Toolbar title="Marketplace" showBackButton={true} isWalletConnected={!!currentUserAddress} />
        
        <div className="animate-fade-in p-5 lg:px-8">
          {/* Header */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-2xl lg:text-4xl font-bold">Marketplace</h1>
            </div>
            <p className="text-muted-foreground lg:text-lg">
              Discover, collect, and trade unique artworks from the Permalink community.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{items.filter(i => i.listingType === 'primary').length}</div>
                <div className="text-sm text-muted-foreground">Primary Sales</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-muted-foreground">Active Offers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artworks, artists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="primary">Primary Sales</SelectItem>
                      <SelectItem value="listing">Listings</SelectItem>
                      <SelectItem value="offer">Offers</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recently Added</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {sortedItems.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Try adjusting your search or filters" : "No marketplace items available yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "space-y-4"
            }>
              {sortedItems.map((item) => (
                viewMode === "grid" ? (
                  <div key={`${item.listingType}-${item.tokenId}`} className="cursor-pointer" onClick={() => router.push(`/item/${item.tokenId}`)}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        {/* Image */}
                        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                          {item.imageType === 'zip' ? (
                            <div className="text-center p-4">
                              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-2">
                                <Archive className="h-8 w-8 text-purple-600" />
                              </div>
                              <div className="text-sm font-medium text-purple-600">Generative Art</div>
                            </div>
                          ) : item.imageUri ? (
                            <Image
                              unoptimized={true}
                              src={item.imageUri}
                              alt={item.title}
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-muted-foreground">No preview</div>
                          )}
                          
                          {/* Type Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge variant={item.listingType === 'primary' ? 'default' : item.listingType === 'listing' ? 'secondary' : 'outline'}>
                              {item.listingType === 'primary' ? 'Primary' : item.listingType === 'listing' ? 'Listed' : 'Offer'}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-semibold truncate mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            by {formatAddress(item.artist)}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-bold">{item.currentPrice} XTZ</div>
                              {item.amount && item.amount > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  {item.amount} available
                                </div>
                              )}
                            </div>
                            <Button size="sm">
                              {item.listingType === 'primary' ? 'Buy Now' : item.listingType === 'listing' ? 'Buy' : 'View'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card key={`${item.listingType}-${item.tokenId}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/item/${item.tokenId}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.imageType === 'zip' ? (
                            <Archive className="h-8 w-8 text-purple-600" />
                          ) : item.imageUri ? (
                            <Image
                              unoptimized={true}
                              src={item.imageUri}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground">No preview</div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{item.title}</h3>
                            <Badge variant={item.listingType === 'primary' ? 'default' : item.listingType === 'listing' ? 'secondary' : 'outline'} className="flex-shrink-0">
                              {item.listingType === 'primary' ? 'Primary' : item.listingType === 'listing' ? 'Listed' : 'Offer'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            by {formatAddress(item.artist)}
                          </p>
                        </div>

                        {/* Price and Action */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold mb-1">{item.currentPrice} XTZ</div>
                          {item.amount && item.amount > 1 && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {item.amount} available
                            </div>
                          )}
                          <Button size="sm">
                            {item.listingType === 'primary' ? 'Buy Now' : item.listingType === 'listing' ? 'Buy' : 'View'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </div>
      </MainContainer>
    </WhitelistGuard>
  );
} 