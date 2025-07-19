"use client";

import { useState, useEffect } from "react";
import { useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Tag, 
  Clock, 
  TrendingUp, 
  ShoppingCart, 
  Gavel, 
  X,
  ExternalLink,
  User,
  Loader2,
  AlertTriangle
} from "lucide-react";
import {
  getTokenListings,
  getTokenOffers,
  buyFromListing,
  makeOffer,
  acceptOffer,
  cancelListing,
  cancelOffer,
  isMarketplaceApproved,
  approveMarketplace,
  formatTimeRemaining,
  formatAddress as formatMarketplaceAddress,
  type Listing,
  type Offer
} from "@/lib/marketplace";
import { getAccountFromWallet, formatAddress } from "@/lib/contract";
import { getContractAddress } from "@/lib/contract-config";

interface MarketplaceSectionProps {
  tokenId: number;
  currentUserAddress?: string;
  isOwner: boolean;
  userBalance: number;
  artwork: {
    title: string;
    currentSupply: number;
    maxSupply: number;
    isActive: boolean;
  };
}

export function MarketplaceSection({ 
  tokenId, 
  currentUserAddress, 
  isOwner, 
  userBalance, 
  artwork 
}: MarketplaceSectionProps) {
  const activeWallet = useActiveWallet();

  // State
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Form states (for offers only)
  const [offerAmount, setOfferAmount] = useState("1");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDuration, setOfferDuration] = useState("7");

  useEffect(() => {
    loadMarketplaceData();
  }, [tokenId]);

  useEffect(() => {
    if (currentUserAddress) {
      checkApproval();
    }
  }, [currentUserAddress]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const [listingsData, offersData] = await Promise.all([
        getTokenListings(tokenId),
        getTokenOffers(tokenId)
      ]);
      
      setListings(listingsData);
      setOffers(offersData);
    } catch (error) {
      console.error("Error loading marketplace data:", error);
      toast.error("Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };

  const checkApproval = async () => {
    if (!currentUserAddress) return;
    
    try {
      const contractAddress = getContractAddress();
      if (!contractAddress) return;
      
      const approved = await isMarketplaceApproved(currentUserAddress, contractAddress);
      setIsApproved(approved);
    } catch (error) {
      console.error("Error checking approval:", error);
    }
  };

  const handleApproval = async () => {
    if (!activeWallet || !currentUserAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setProcessing(true);
      toast.loading("Approving marketplace...", { id: "approval" });

      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet", { id: "approval" });
        return;
      }

      const contractAddress = getContractAddress();
      if (!contractAddress) {
        toast.error("Contract address not configured", { id: "approval" });
        return;
      }

      const result = await approveMarketplace(account, contractAddress);

      if (result.success) {
        toast.success("Marketplace approved successfully!", { id: "approval" });
        
        // Show transaction hash
        if (result.txHash) {
          toast.success(
            `Approval confirmed! Hash: ${result.txHash.slice(0, 10)}...`,
            {
              action: {
                label: "View on Explorer",
                onClick: () => window.open(
                  `https://testnet.explorer.etherlink.com/tx/${result.txHash}`,
                  '_blank'
                )
              },
              duration: 10000,
            }
          );
        }

        // Recheck approval status
        setTimeout(() => {
          checkApproval();
        }, 3000);
      } else {
        toast.error(result.error || "Failed to approve marketplace", { id: "approval" });
      }
      
    } catch (error) {
      console.error("Error approving marketplace:", error);
      toast.error("Failed to approve marketplace", { id: "approval" });
    } finally {
      setProcessing(false);
    }
  };



  const handleBuyListing = async (listing: Listing, amount: number) => {
    if (!activeWallet || !currentUserAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setProcessing(true);
      
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet");
        return;
      }

      const totalPrice = (parseFloat(listing.pricePerToken) * amount).toFixed(4);
      const result = await buyFromListing(account, listing.listingId, amount, totalPrice);

      if (result.success) {
        toast.success("Purchase successful!");
        loadMarketplaceData();
      } else {
        toast.error(result.error || "Failed to purchase");
      }
    } catch (error) {
      console.error("Error buying listing:", error);
      toast.error("Failed to purchase");
    } finally {
      setProcessing(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!activeWallet || !currentUserAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    const amount = parseInt(offerAmount);
    const price = parseFloat(offerPrice);
    const duration = parseInt(offerDuration);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (isNaN(price) || price <= 0) {
      toast.error("Invalid price");
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      toast.error("Invalid duration");
      return;
    }

    try {
      setProcessing(true);
      
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet");
        return;
      }

      const result = await makeOffer(account, tokenId, amount, offerPrice, duration);

      if (result.success) {
        toast.success("Offer made successfully!");
        setOfferAmount("1");
        setOfferPrice("");
        setOfferDuration("7");
        loadMarketplaceData();
      } else {
        toast.error(result.error || "Failed to make offer");
      }
    } catch (error) {
      console.error("Error making offer:", error);
      toast.error("Failed to make offer");
    } finally {
      setProcessing(false);
    }
  };

  const bestListing = listings.length > 0 
    ? listings.sort((a, b) => parseFloat(a.pricePerToken) - parseFloat(b.pricePerToken))[0]
    : null;

  const bestOffer = offers.length > 0 
    ? offers.sort((a, b) => parseFloat(b.pricePerToken) - parseFloat(a.pricePerToken))[0]
    : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading marketplace data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Marketplace Overview */}
      <Card className="py-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Secondary Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Best Listing</div>
              {bestListing ? (
                <div className="font-semibold">{bestListing.pricePerToken} XTZ</div>
              ) : (
                <div className="text-muted-foreground">No listings</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Offer</div>
              {bestOffer ? (
                <div className="font-semibold">{bestOffer.pricePerToken} XTZ</div>
              ) : (
                <div className="text-muted-foreground">No offers</div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Listings</span>
              <span>{listings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Offers</span>
              <span>{offers.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Notice */}
      {currentUserAddress && userBalance > 0 && !isApproved && (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <div className="font-semibold text-yellow-600">Marketplace Approval Required</div>
                <div className="text-sm text-yellow-600/80">
                  Approve the marketplace to list your NFTs for sale or make offers.
                </div>
              </div>
              <Button 
                onClick={handleApproval}
                disabled={processing}
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                {processing ? "Approving..." : "Approve"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marketplace Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listings">
            Listings ({listings.length})
          </TabsTrigger>
          <TabsTrigger value="offers">
            Offers ({offers.length})
          </TabsTrigger>
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="mt-6">
          <Card className="py-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active listings for this artwork
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <div key={listing.listingId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">{listing.pricePerToken} XTZ each</div>
                        <div className="text-sm text-muted-foreground">
                          {listing.amount} edition{listing.amount > 1 ? 's' : ''} • by {formatAddress(listing.seller)}
                        </div>
                      </div>
                      {currentUserAddress && currentUserAddress !== listing.seller && (
                        <Button
                          onClick={() => handleBuyListing(listing, Math.min(listing.amount, 1))}
                          disabled={processing}
                          size="sm"
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Buy
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers" className="mt-6">
          <Card className="py-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Active Offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active offers for this artwork
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.offerId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">{offer.pricePerToken} XTZ each</div>
                        <div className="text-sm text-muted-foreground">
                          {offer.amount} edition{offer.amount > 1 ? 's' : ''} • by {formatAddress(offer.buyer)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Expires in {formatTimeRemaining(offer.expiresAt)}
                        </div>
                      </div>
                      {currentUserAddress && userBalance > 0 && currentUserAddress !== offer.buyer && isApproved && (
                        <Button
                          onClick={() => {
                            // This would trigger accept offer
                            toast.info("Accept offer functionality coming soon!");
                          }}
                          disabled={processing}
                          size="sm"
                          variant="outline"
                        >
                          Accept
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Make Offer Form */}
          {currentUserAddress && !isOwner && (
            <Card className="mt-4 py-6">
              <CardHeader>
                <CardTitle>Make an Offer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="offer-amount">Amount</Label>
                    <Input
                      id="offer-amount"
                      type="number"
                      min="1"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="offer-price">Price per token (XTZ)</Label>
                    <Input
                      id="offer-price"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="offer-duration">Duration (days)</Label>
                    <Input
                      id="offer-duration"
                      type="number"
                      min="1"
                      max="30"
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleMakeOffer}
                  disabled={processing || !offerAmount || !offerPrice || !offerDuration}
                  className="w-full mt-4"
                >
                  {processing ? "Making offer..." : `Make Offer for ${offerPrice && offerAmount ? (parseFloat(offerPrice) * parseInt(offerAmount)).toFixed(3) : '0'} XTZ`}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>


      </Tabs>
    </div>
  );
} 