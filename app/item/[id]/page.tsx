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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, Share, ShoppingCart, User, Calendar, Loader2, Archive, Play, ExternalLink, Tag, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import { 
  getArtwork, 
  getArtistProfile,
  getUserTokenBalance,
  purchaseArtworkV5,
  getAccountFromWallet,
  formatAddress,
  formatDate,
  type Artwork,
  type ArtistProfile
} from "@/lib/contract";
import {
  isMarketplaceApproved,
  approveMarketplace,
  createListing
} from "@/lib/marketplace";
import { getContractAddress } from "@/lib/contract-config";
import { toast } from "sonner";
import { WhitelistGuard } from "@/components/whitelist-guard";
import { MarketplaceSection } from "@/components/marketplace-section";
import Image from "next/image";

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
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [showInteractiveViewer, setShowInteractiveViewer] = useState(false);
  const [interactiveContent, setInteractiveContent] = useState<string | null>(null);
  const [loadingInteractive, setLoadingInteractive] = useState(false);
  
  // List for Sale Modal States
  const [showListModal, setShowListModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [listingAmount, setListingAmount] = useState("1");
  const [listingPrice, setListingPrice] = useState("");
  const [processing, setProcessing] = useState(false);

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
    if (!activeWallet || !artwork) {
      toast.error("Please connect your wallet first");
      return;
    }

    const amount = parseInt(purchaseAmount);
    const availableForPurchase = artwork.maxSupply - artwork.currentSupply;
    
    // Validation
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (amount > availableForPurchase) {
      toast.error(`Only ${availableForPurchase} edition${availableForPurchase > 1 ? 's' : ''} available`);
      return;
    }

    const totalPrice = (parseFloat(artwork.price) * amount).toFixed(4);
    
    try {
      setPurchasing(true);
      
      // Get account from wallet
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet");
        return;
      }

      // Show purchasing notification
      toast.loading(`Purchasing ${amount} edition${amount > 1 ? 's' : ''} for ${totalPrice} XTZ...`, {
        id: "purchase-tx"
      });

      // Execute purchase
      const result = await purchaseArtworkV5(account, tokenId, amount, totalPrice);

      if (result.success) {
        toast.success(
          `Successfully purchased ${amount} edition${amount > 1 ? 's' : ''}!`,
          { id: "purchase-tx" }
        );

        // Show transaction hash
        if (result.txHash) {
          console.log("Purchase transaction hash:", result.txHash);
          
          toast.success(
            `Purchase confirmed! Hash: ${result.txHash.slice(0, 10)}...`,
            {
              action: {
                label: "View on Explorer",
                onClick: () => window.open(
                  `https://testnet.explorer.etherlink.com/tx/${result.txHash}`,
                  '_blank'
                )
              },
              duration: 15000,
            }
          );
        }

        // Show refreshing notification
        toast.loading("Updating artwork data...", {
          id: "purchase-refresh"
        });

        // Refresh data after successful purchase
        setTimeout(async () => {
          try {
            // Refetch artwork data
            const updatedArtwork = await getArtwork(tokenId);
            if (updatedArtwork) {
              setArtwork(updatedArtwork);
            }

            // Refetch user balance
            if (currentUserAddress) {
              const updatedBalance = await getUserTokenBalance(currentUserAddress, tokenId);
              setUserBalance(updatedBalance);
            }

            toast.success("Artwork data updated!", {
              id: "purchase-refresh"
            });

            // Reset purchase amount to 1
            setPurchaseAmount("1");

          } catch (refreshError) {
            console.error("Error refreshing data:", refreshError);
            toast.error("Purchase successful, but failed to refresh data. Please reload the page.", {
              id: "purchase-refresh"
            });
          }
        }, 3000); // Wait for blockchain confirmation

      } else {
        toast.error(result.error || "Purchase failed", {
          id: "purchase-tx"
        });
      }

    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("An unexpected error occurred during purchase", {
        id: "purchase-tx"
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handlePlayInteractive = async () => {
    if (!artwork || artwork.imageType !== 'zip') return;
    
    try {
      setLoadingInteractive(true);
      toast.loading("Loading interactive artwork...", { id: "loading-interactive" });
      
      // Get the base64 zip data from the imageUri
      if (!artwork.imageUri) {
        toast.error("No interactive content available", { id: "loading-interactive" });
        return;
      }
      
      // Extract base64 data from data URI
      const base64Data = artwork.imageUri.split(',')[1];
      if (!base64Data) {
        toast.error("Invalid interactive content format", { id: "loading-interactive" });
        return;
      }
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Load JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(bytes);
      
      // Look for index.html
      const indexFile = zip.file('index.html');
      if (!indexFile) {
        toast.error("No index.html found in the artwork package", { id: "loading-interactive" });
        return;
      }
      
      // Get the HTML content
      let htmlContent = await indexFile.async('text');
      
      // Process other files and create blob URLs
      const fileUrls: { [key: string]: string } = {};
      
      for (const [path, zipObject] of Object.entries(zip.files)) {
        if (!zipObject.dir && path !== 'index.html') {
          const blob = await zipObject.async('blob');
          fileUrls[path] = URL.createObjectURL(blob);
        }
      }
      
      // Replace relative file references with blob URLs
      Object.keys(fileUrls).forEach(path => {
        const regex = new RegExp(`(?:src="|href=")${path}(?=")`, 'g');
        htmlContent = htmlContent.replace(regex, `src="${fileUrls[path]}"`);
      });
      
      // Inject the token hash into the HTML
      const hashInjection = `
        <script>
          // Inject token hash for deterministic generation
          const tokenHash = "${artwork.tokenId ? `0x${artwork.tokenId.toString(16).padStart(64, '0')}` : '0x0'}";
          
          // Override URL parameters
          const originalURLSearchParams = window.URLSearchParams;
          window.URLSearchParams = function(search) {
            const params = new originalURLSearchParams(search);
            params.set('hash', tokenHash);
            return params;
          };
          
          // Send hash message after load
          window.addEventListener('load', function() {
            window.postMessage({
              type: 'SET_HASH',
              hash: tokenHash
            }, '*');
          });
        </script>
      `;
      
      // Insert the script before closing head tag
      htmlContent = htmlContent.replace('</head>', hashInjection + '</head>');
      
      setInteractiveContent(htmlContent);
      setShowInteractiveViewer(true);
      
      toast.success("Interactive artwork loaded!", { id: "loading-interactive" });
      
    } catch (error) {
      console.error('Error loading interactive content:', error);
      toast.error("Failed to load interactive content", { id: "loading-interactive" });
    } finally {
      setLoadingInteractive(false);
    }
  };

  const handleStopInteractive = () => {
    setShowInteractiveViewer(false);
    setInteractiveContent(null);
  };

  // Marketplace functions
  const checkMarketplaceApproval = async () => {
    if (!currentUserAddress || !artwork) return;
    
    try {
      const contractAddress = getContractAddress();
      if (!contractAddress) return;
      
      const approved = await isMarketplaceApproved(currentUserAddress, contractAddress);
      setIsApproved(approved);
    } catch (error) {
      console.error("Error checking marketplace approval:", error);
    }
  };

  const handleListForSaleClick = async () => {
    if (!currentUserAddress || !userBalance) return;
    
    await checkMarketplaceApproval();
    
    if (isApproved) {
      setShowListModal(true);
    } else {
      setShowApprovalModal(true);
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

        setIsApproved(true);
        setShowApprovalModal(false);
        setShowListModal(true);
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

  const handleCreateListing = async () => {
    if (!activeWallet || !artwork || !currentUserAddress) {
      toast.error("Missing required data");
      return;
    }

    const amount = parseInt(listingAmount);
    const pricePerToken = parseFloat(listingPrice);

    if (amount <= 0 || amount > userBalance) {
      toast.error("Invalid amount");
      return;
    }

    if (pricePerToken <= 0) {
      toast.error("Invalid price");
      return;
    }

    try {
      setProcessing(true);
      toast.loading("Creating listing...", { id: "listing" });

      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet", { id: "listing" });
        return;
      }

      const result = await createListing(
        account,
        tokenId,
        amount,
        listingPrice
      );

      if (result.success) {
        toast.success(`Successfully listed ${amount} edition${amount > 1 ? 's' : ''} for ${pricePerToken} XTZ each!`, { id: "listing" });
        
        if (result.txHash) {
          toast.success(
            `Listing confirmed! Hash: ${result.txHash.slice(0, 10)}...`,
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

        setShowListModal(false);
        setListingAmount("1");
        setListingPrice("");

        // Refresh user balance
        setTimeout(async () => {
          if (currentUserAddress) {
            const updatedBalance = await getUserTokenBalance(currentUserAddress, tokenId);
            setUserBalance(updatedBalance);
          }
        }, 3000);
      } else {
        toast.error(result.error || "Failed to create listing", { id: "listing" });
      }
      
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing", { id: "listing" });
    } finally {
      setProcessing(false);
    }
  };

  // Check approval status when user balance changes
  useEffect(() => {
    if (currentUserAddress && userBalance > 0) {
      checkMarketplaceApproval();
    }
  }, [currentUserAddress, userBalance]);

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
    <WhitelistGuard>
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
                <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground overflow-hidden relative">
                  {artwork.imageType === 'zip' && showInteractiveViewer && interactiveContent ? (
                    // Interactive content running
                    <div className="w-full h-full relative">
                      <iframe
                        srcDoc={interactiveContent}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                        title={`Interactive artwork: ${artwork.title}`}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const blob = new Blob([interactiveContent], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          }}
                          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleStopInteractive}
                          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ) : artwork.imageType === 'zip' ? (
                    // Interactive preview (not yet loaded)
                    <div className="text-center p-8">
                      <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Archive className="h-12 w-12 text-purple-600" />
                      </div>
                      <div className="text-lg font-semibold mb-2 text-purple-600">Generative Art</div>
                      <div className="text-sm mb-4">Interactive artwork package</div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                        <Play className="h-4 w-4" />
                        <span>Contains interactive code</span>
                      </div>
                      <Button 
                        onClick={handlePlayInteractive}
                        disabled={loadingInteractive}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        {loadingInteractive ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Play Interactive Art
                          </>
                        )}
                      </Button>
                    </div>
                  ) : artwork.imageUri ? (
                    // Regular image
                    <Image
                      unoptimized={true}
                      src={artwork.imageUri} 
                      alt={artwork.title}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // No preview
                    <div className="text-center p-8">
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
                    <div>
                      <div className="text-sm text-muted-foreground">Storage</div>
                      <div className="text-green-600 font-medium">On-Chain</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">File Size</div>
                      <div>{(artwork.imageSize / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>

                  {/* Storage Info */}
                  {artwork.metadata && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Storage Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">File Type</div>
                          <div className="capitalize flex items-center gap-2">
                            {artwork.imageType === 'zip' && <Archive className="h-4 w-4 text-purple-600" />}
                            {artwork.imageType}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Metadata</div>
                          <div className="text-blue-600">Dynamic</div>
                        </div>
                        {artwork.imageType === 'zip' && (
                          <div className="col-span-2">
                            <div className="text-muted-foreground">Content Type</div>
                            <div className="text-purple-600 flex items-center gap-2">
                              <Play className="h-4 w-4" />
                              Interactive/Generative Art
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                                                 <Image
                                                 unoptimized={true}
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
                          className={`mt-1 ${
                            parseInt(purchaseAmount || "0") > availableSupply || parseInt(purchaseAmount || "0") <= 0
                              ? "border-destructive focus:ring-destructive" 
                              : ""
                          }`}
                          disabled={purchasing}
                        />
                        <div className="text-xs mt-1">
                          {parseInt(purchaseAmount || "0") > availableSupply ? (
                            <span className="text-destructive">
                              Maximum {availableSupply} available
                            </span>
                          ) : parseInt(purchaseAmount || "0") <= 0 ? (
                            <span className="text-destructive">
                              Amount must be at least 1
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {availableSupply} available
                            </span>
                          )}
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
                        disabled={purchasing || !currentUserAddress || parseInt(purchaseAmount || "0") <= 0 || parseInt(purchaseAmount || "0") > availableSupply}
                      >
                        {!purchasing && <ShoppingCart className={'h-4 w-4 mr-2'} />}
                        {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {purchasing ? "Processing..." : `Purchase for ${totalPrice} XTZ`}
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

                  {/* List for Sale Button - Only show if user owns items */}
                  {currentUserAddress && userBalance > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        size="lg"
                        onClick={handleListForSaleClick}
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Tag className="h-4 w-4 mr-2" />
                            List for Sale
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Sell your editions on the secondary market
                      </p>
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
                    
                    {/* Additional metadata attributes */}
                    {artwork.metadata?.attributes && (
                      <>
                        <div className="border-t pt-3">
                          <h4 className="font-medium mb-3 text-sm">Metadata Attributes</h4>
                          <div className="space-y-2">
                            {artwork.metadata.attributes.slice(0, 6).map((attr, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{attr.trait_type}</span>
                                <span className="font-medium">{attr.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Storage Type</span>
                        <span className="font-medium">
                          {artwork.metadata ? "On-chain" : "External"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Marketplace Section */}
        <div className="lg:col-span-12 mt-8">
          <MarketplaceSection
            tokenId={tokenId}
            currentUserAddress={currentUserAddress}
            isOwner={isOwner}
            userBalance={userBalance}
          />
        </div>
      </div>

      {/* Approval Warning Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Marketplace Approval Required
            </DialogTitle>
            <DialogDescription>
              Before you can list your NFT for sale, you need to approve the marketplace contract to handle your tokens. This is a one-time approval per wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">What happens when you approve?</h4>
                  <p className="text-sm text-amber-700">
                    You grant the marketplace permission to transfer your NFTs when someone purchases them. 
                    This doesn&apos;t give access to your funds or other assets.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowApprovalModal(false)}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApproval}
                className="flex-1"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Marketplace
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Listing Form Modal */}
      <Dialog open={showListModal} onOpenChange={setShowListModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              List NFT for Sale
            </DialogTitle>
            <DialogDescription>
              Set your price and choose how many editions to list on the secondary market.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Balance Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  You own {userBalance} edition{userBalance > 1 ? 's' : ''} of this NFT
                </span>
              </div>
            </div>

            {/* Listing Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="listing-amount">Amount to List</Label>
                <Input
                  id="listing-amount"
                  type="number"
                  min="1"
                  max={userBalance}
                  value={listingAmount}
                  onChange={(e) => setListingAmount(e.target.value)}
                  className="mt-1"
                  placeholder="1"
                  disabled={processing}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Maximum: {userBalance} available
                </div>
              </div>

              <div>
                <Label htmlFor="listing-price">Price per Edition (XTZ)</Label>
                <Input
                  id="listing-price"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="mt-1"
                  placeholder="0.5"
                  disabled={processing}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Minimum: 0.001 XTZ
                </div>
              </div>

              {/* Total Calculation */}
              {listingAmount && listingPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Total Listing Value:</span>
                    <span className="font-bold text-blue-900">
                      {(parseInt(listingAmount || "0") * parseFloat(listingPrice || "0")).toFixed(4)} XTZ
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {listingAmount} edition{parseInt(listingAmount || "0") > 1 ? 's' : ''} × {listingPrice} XTZ each
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowListModal(false)}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateListing}
                className="flex-1"
                disabled={processing || !listingAmount || !listingPrice || parseInt(listingAmount) <= 0 || parseFloat(listingPrice) <= 0 || parseInt(listingAmount) > userBalance}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Listing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    List for {listingPrice && listingAmount ? (parseInt(listingAmount) * parseFloat(listingPrice)).toFixed(4) : '0'} XTZ
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </MainContainer>
    </WhitelistGuard>
  );
} 