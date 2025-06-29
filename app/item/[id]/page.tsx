"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Share, ShoppingCart, User, Calendar } from "lucide-react";
import { 
  getArtwork, 
  getArtistProfile,
  getUserTokenBalance,
  formatAddress,
  formatDate,
  type Artwork,
  type ArtistProfile
} from "@/lib/contract";
import { toast } from "sonner";

export default function DynamicItemPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = parseInt(params.id as string);
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;
  
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArtworkData() {
      if (isNaN(tokenId) || tokenId <= 0) {
        setError("Invalid token ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch artwork details
        const artworkData = await getArtwork(tokenId);
        if (!artworkData) {
          setError("Artwork not found");
          setLoading(false);
          return;
        }
        setArtwork(artworkData);

        // Fetch artist profile
        const profile = await getArtistProfile(artworkData.artist);
        setArtistProfile(profile);

        // Fetch user's balance if wallet is connected
        if (currentUserAddress) {
          const balance = await getUserTokenBalance(currentUserAddress, tokenId);
          setUserBalance(balance);
        }

      } catch (err) {
        console.error("Error fetching artwork data:", err);
        setError("Failed to load artwork data");
      } finally {
        setLoading(false);
      }
    }

    fetchArtworkData();
  }, [tokenId, currentUserAddress]);

  const handlePurchase = async () => {
    if (!activeWallet || !artwork) return;

    const amount = parseInt(purchaseAmount);
    if (amount <= 0 || amount > (artwork.maxSupply - artwork.currentSupply)) {
      toast.error("Invalid purchase amount");
      return;
    }

    // TODO: Implement purchase with thirdweb v5
    toast.error("Purchase functionality will be available soon. Contract integration in progress.");
  };

  const isOwner = currentUserAddress?.toLowerCase() === artwork?.artist.toLowerCase();
  const availableSupply = artwork ? artwork.maxSupply - artwork.currentSupply : 0;
  const totalPrice = artwork ? (parseFloat(artwork.price) * parseInt(purchaseAmount || "1")).toFixed(4) : "0";

  if (loading) {
    return (
      <MainContainer>
        <Toolbar title="Loading..." showBackButton={true} isWalletConnected={!!currentUserAddress} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading artwork...</p>
          </div>
        </div>
      </MainContainer>
    );
  }

  if (error || !artwork) {
    return (
      <MainContainer>
        <Toolbar title="Error" showBackButton={true} isWalletConnected={!!currentUserAddress} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || "Artwork not found"}</p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <Toolbar 
        title={artwork.title} 
        showBackButton={true} 
        isWalletConnected={!!currentUserAddress} 
      />

      <div className="animate-fade-in">
        {/* Desktop Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:p-8">
          {/* Artwork Display - Left side on desktop */}
          <div className="lg:col-span-8">
            <Card className="mb-6 lg:mb-0">
              <CardContent className="p-0">
                {/* Artwork Preview */}
                <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                  {artwork.metadataURI ? (
                    <div className="text-center p-8">
                      <div className="text-lg font-semibold mb-2">{artwork.title}</div>
                      <div className="text-sm opacity-75">Token ID: {artwork.tokenId}</div>
                      <div className="text-xs mt-4">Generative Art NFT</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-lg font-semibold mb-2">{artwork.title}</div>
                      <div className="text-sm">No preview available</div>
                    </div>
                  )}
                </div>

                {/* Artwork Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold">{artwork.title}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={artwork.isActive ? "default" : "secondary"}>
                          {artwork.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {artwork.currentSupply}/{artwork.maxSupply} minted
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  {artwork.description && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {artwork.description}
                      </p>
                    </div>
                  )}

                  {/* Artwork Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(artwork.createdAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Token Standard</div>
                      <div>ERC-1155</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Panel - Right side on desktop */}
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {/* Artist Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {artistProfile?.avatarURI ? (
                                                 <img 
                           src={artistProfile.avatarURI} 
                           alt={artistProfile.artistName || "Artist avatar"}
                           className="w-full h-full object-cover"
                         />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {artistProfile?.artistName || "Unknown Artist"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatAddress(artwork.artist)}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/artist/${artwork.artist}`)}
                  >
                    View Artist Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Purchase Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-1">Price per edition</div>
                    <div className="text-3xl font-bold">{artwork.price} XTZ</div>
                  </div>

                  {/* User's Balance */}
                  {currentUserAddress && userBalance > 0 && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="text-green-600 text-sm">
                        You own {userBalance} edition{userBalance > 1 ? 's' : ''} of this artwork
                      </div>
                    </div>
                  )}

                  {/* Purchase Form */}
                  {artwork.isActive && availableSupply > 0 && !isOwner ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="1"
                          max={availableSupply}
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          className="mt-1"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {availableSupply} available
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between mb-2">
                          <span>Total</span>
                          <span className="font-semibold">{totalPrice} XTZ</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handlePurchase}
                        disabled={purchasing || !currentUserAddress}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {purchasing ? "Purchasing..." : "Purchase"}
                      </Button>
                      
                      {!currentUserAddress && (
                        <p className="text-sm text-muted-foreground text-center">
                          Connect your wallet to purchase
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      {isOwner ? (
                        <div className="text-muted-foreground">
                          You are the creator of this artwork
                        </div>
                      ) : !artwork.isActive ? (
                        <div className="text-muted-foreground">
                          This artwork is not available for purchase
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          Sold out
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Properties */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Properties</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token ID</span>
                      <span>{artwork.tokenId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Supply</span>
                      <span>{artwork.maxSupply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Supply</span>
                      <span>{artwork.currentSupply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(artwork.createdAt)}</span>
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