"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Share, ShoppingCart, User, Calendar, Loader2, Archive, ExternalLink, Tag, AlertTriangle, CheckCircle, DollarSign, Coins } from "lucide-react";
import { 
  getArtworkSeries,
  getIndividualArtwork,
  getArtistProfile,
  doesUserOwnToken,
  getTokenOwner,
  purchaseFromSeriesV5,
  getAccountFromWallet,
  formatAddress,
  formatDate,
  getArtworkImageData,
  getSeriesTokens,
  type ArtistProfile
} from "@/lib/contractERC721";
import { toast } from "sonner";
import { WhitelistGuard } from "@/components/whitelist-guard";
import { MarketplaceSection } from "@/components/marketplace-section";
import { ImageDisplay } from "@/components/image-display";
import { SellModal } from "@/components/sell-modal";

interface SeriesData {
  artist: string;
  title: string;
  description: string;
  imageType: string;
  imageSize: number;
  price: string;
  maxSupply: number;
  minted: number;
  isActive: boolean;
  createdAt: number;
}

interface TokenData {
  seriesId: number;
  artist: string;
  title: string;
  description: string;
  imageType: string;
  imageSize: number;
  mintedAt: number;
}



export default function ERC721ItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;
  
  // Determine if this is a series ID or token ID based on URL structure
  const isSeriesView = id.startsWith('series-');
  const numericId = isSeriesView ? parseInt(id.replace('series-', '')) : parseInt(id);
  
  const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [isTokenOwner, setIsTokenOwner] = useState(false);
  const [tokenOwner, setTokenOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactiveContent, setInteractiveContent] = useState<string | null>(null);
  const [loadingInteractive, setLoadingInteractive] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (isNaN(numericId) || numericId <= 0) {
        setError("Invalid ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (isSeriesView) {
          // Fetch series data
          const series = await getArtworkSeries(numericId);
          if (!series) {
            setError("Series not found");
            setLoading(false);
            return;
          }
          setSeriesData(series);

          // Fetch artist profile
          const profile = await getArtistProfile(series.artist);
          setArtistProfile(profile);


          
          // Auto-load interactive content if it's a ZIP file
          if (series.imageType === 'zip') {
            await loadInteractiveContent(series);
          }
        } else {
          // Fetch individual token data
          const token = await getIndividualArtwork(numericId);
          if (!token) {
            setError("Token not found");
            setLoading(false);
            return;
          }
          setTokenData(token);

          // Fetch series data for the token
          const series = await getArtworkSeries(token.seriesId);
          setSeriesData(series);

          // Fetch artist profile
          const profile = await getArtistProfile(token.artist);
          setArtistProfile(profile);

          // Check ownership
          if (currentUserAddress) {
            const ownsToken = await doesUserOwnToken(currentUserAddress, numericId);
            setIsTokenOwner(ownsToken);
          }

          // Get token owner
          const owner = await getTokenOwner(numericId);
          setTokenOwner(owner);


          
          // Auto-load interactive content if it's a ZIP file
          if (series && series.imageType === 'zip') {
            await loadInteractiveContent(series);
          }
        }

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [numericId, isSeriesView, currentUserAddress]);



  const handlePurchaseFromSeries = async () => {
    if (!activeWallet || !seriesData) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!seriesData.isActive) {
      toast.error("This series is not available for purchase");
      return;
    }

    if (seriesData.minted >= seriesData.maxSupply) {
      toast.error("This series is sold out");
      return;
    }

    try {
      setPurchasing(true);
      
      // Get account from wallet
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet");
        return;
      }

      // Show purchasing notification
      toast.loading(`Purchasing unique NFT for ${seriesData.price} XTZ...`, {
        id: "purchase-tx"
      });

      // Execute purchase
      const result = await purchaseFromSeriesV5(account, numericId, seriesData.price);

      if (result.success) {
        toast.success("Successfully purchased unique NFT!", { id: "purchase-tx" });

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

        // Show redirect notification
        toast.loading("Redirecting to your new NFT...", {
          id: "purchase-redirect"
        });

        // Redirect to the new token page if we get the token ID from result
        setTimeout(() => {
          if (result.tokenId) {
            router.push(`/item/${result.tokenId}`);
          } else {
            // Refresh current page
            window.location.reload();
          }
        }, 3000);

      } else {
        toast.error(result.error || "Purchase failed", { id: "purchase-tx" });
      }

    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("An unexpected error occurred during purchase", { id: "purchase-tx" });
    } finally {
      setPurchasing(false);
    }
  };

  const loadInteractiveContent = async (seriesInfo?: any) => {
    const series = seriesInfo || seriesData;
    if (!series || series.imageType !== 'zip') return;
    
    try {
      setLoadingInteractive(true);
      toast.loading("Loading interactive artwork...", { id: "loading-interactive" });
      
      // Get the raw image data
      let imageData = null;
      if (isSeriesView) {
        // For series view, try to get data from first minted token
        if (series && series.minted > 0) {
          const seriesTokens = await getSeriesTokens(numericId);
          if (seriesTokens && seriesTokens.length > 0) {
            imageData = await getArtworkImageData(seriesTokens[0]);
          }
        }
      } else {
        // For token view, use the actual token ID
        imageData = await getArtworkImageData(numericId);
      }
      if (!imageData) {
        toast.error("No interactive content available", { id: "loading-interactive" });
        return;
      }
      
      // Convert hex string to bytes
      const hexString = imageData.imageData.startsWith('0x') ? imageData.imageData.slice(2) : imageData.imageData;
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      
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
      
      // Generate token hash for unique generation
      const tokenHash = isSeriesView 
        ? '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('') // Random for series preview
        : `0x${numericId.toString(16).padStart(64, '0')}`; // Deterministic for specific token
      
      // Inject hash directly into the global scope at the very beginning
      const hashInjection = 
        '<script>' +
        '// EARLY INJECTION: Set hash before any other scripts run\n' +
        'console.log("🔗 Permalink Platform: Injecting hash:", "' + tokenHash.substring(0, 10) + '...");\n' +
        'window.PERMALINK_TOKEN_HASH = "' + tokenHash + '";\n' +
        'window.PERMALINK_IS_NFT_MODE = ' + (!isSeriesView) + ';\n' +
        '\n' +
        '// Override URLSearchParams to always return our hash\n' +
        'const OriginalURLSearchParams = window.URLSearchParams;\n' +
        'window.URLSearchParams = function(search) {\n' +
        '  const params = new OriginalURLSearchParams("hash=' + tokenHash + '");\n' +
        '  return params;\n' +
        '};\n' +
        '\n' +
        '// Override window.location.search\n' +
        'Object.defineProperty(window.location, "search", {\n' +
        '  value: "?hash=' + tokenHash + '",\n' +
        '  writable: false\n' +
        '});\n' +
        '\n' +
        '// Send postMessage as additional method\n' +
        'setTimeout(function() {\n' +
        '  console.log("🔗 Permalink Platform: Sending SET_HASH message");\n' +
        '  window.postMessage({\n' +
        '    type: "SET_HASH",\n' +
        '    hash: "' + tokenHash + '",\n' +
        '    isNFTMode: ' + (!isSeriesView) + '\n' +
        '  }, "*");\n' +
        '}, 50);\n' +
        '</script>';
      
      // Insert the script at the very beginning of the head
      htmlContent = htmlContent.replace('<head>', '<head>' + hashInjection);
      
      setInteractiveContent(htmlContent);
      
      toast.success("Interactive artwork loaded!", { id: "loading-interactive" });
      
    } catch (error) {
      console.error('Error loading interactive artwork:', error);
      toast.error("Failed to load interactive artwork", { id: "loading-interactive" });
    } finally {
      setLoadingInteractive(false);
    }
  };



  if (loading) {
    return (
      <WhitelistGuard>
        <MainContainer>
          <Toolbar title="Loading..." showBackButton={true} isWalletConnected={!!currentUserAddress} />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading artwork data...</p>
            </div>
          </div>
        </MainContainer>
      </WhitelistGuard>
    );
  }

  if (error) {
    return (
      <WhitelistGuard>
        <MainContainer>
          <Toolbar title="Error" showBackButton={true} isWalletConnected={!!currentUserAddress} />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => router.back()} className="mt-4">
                Go Back
              </Button>
            </div>
          </div>
        </MainContainer>
      </WhitelistGuard>
    );
  }

  const displayData = seriesData;
  if (!displayData) return null;

  const isOwner = tokenData && currentUserAddress && currentUserAddress.toLowerCase() === tokenOwner?.toLowerCase();
  const isArtist = currentUserAddress && currentUserAddress.toLowerCase() === displayData.artist.toLowerCase();
  const canPurchase = isSeriesView && displayData.isActive && displayData.minted < displayData.maxSupply && !isArtist;
  const canSell = !isSeriesView && isOwner && !isArtist; // Can sell if owns this specific token and is not the artist

  return (
    <WhitelistGuard>
      <MainContainer>
        <Toolbar 
          title={isSeriesView ? "Series" : "NFT"}
          showBackButton={true} 
          isWalletConnected={!!currentUserAddress} 
        />

        <div className="animate-fade-in p-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Artwork Display */}
              <Card className="mb-6">
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden rounded-t-lg">
                    {displayData.imageType === 'zip' ? (
                      interactiveContent ? (
                        <iframe
                          srcDoc={interactiveContent}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin"
                          title="Interactive artwork"
                        />
                      ) : loadingInteractive ? (
                        <div className="text-center">
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                          </div>
                          <div className="text-lg font-semibold text-purple-600 mb-2">Loading Interactive Artwork</div>
                          <div className="text-sm text-muted-foreground">
                            {isSeriesView ? "Preparing preview..." : "Loading your unique NFT..."}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                            <Archive className="h-12 w-12 text-purple-600" />
                          </div>
                          <div className="text-lg font-semibold text-purple-600 mb-2">Interactive Artwork</div>
                          <div className="text-sm text-muted-foreground">
                            {isSeriesView ? "Preview will load automatically" : "Your unique interactive NFT"}
                          </div>
                        </div>
                      )
                    ) : (
                      <ImageDisplay
                        tokenId={!isSeriesView ? numericId : undefined}
                        seriesId={isSeriesView ? numericId : undefined}
                        className="w-full h-full"
                        alt={displayData.title}
                      />
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2">{displayData.title}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <User className="h-4 w-4" />
                          <span>by {artistProfile?.artistName || formatAddress(displayData.artist)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {isSeriesView 
                              ? `Series created ${formatDate(displayData.createdAt)}`
                              : `Minted ${formatDate(tokenData?.mintedAt || 0)}`
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Series/Token Info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">
                        {isSeriesView ? `Series #${numericId}` : `Token #${numericId}`}
                      </Badge>
                      <Badge variant="outline">ERC-721</Badge>
                      <Badge variant="outline">On-Chain Storage</Badge>
                      {displayData.imageType === 'zip' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
                          Interactive
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {displayData.description || "No description provided."}
                      </p>
                    </div>

                    {/* Supply Info */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Supply Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Total Supply</div>
                          <div className="font-semibold">{displayData.maxSupply}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Minted</div>
                          <div className="font-semibold">{displayData.minted}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Available</div>
                          <div className="font-semibold text-green-600">
                            {displayData.maxSupply - displayData.minted}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Price</div>
                          <div className="font-semibold">{displayData.price} XTZ</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Marketplace Section */}
              {!isSeriesView && (
                <MarketplaceSection 
                  tokenId={numericId} 
                  currentUserAddress={currentUserAddress}
                  isTokenOwner={isTokenOwner}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Purchase Card */}
              {canPurchase && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Purchase from Series</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-lg">
                        <span>Price</span>
                        <span className="font-bold">{displayData.price} XTZ</span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        You will receive a unique NFT with token ID #{displayData.minted + 1}
                      </div>
                      
                      <Button
                        onClick={handlePurchaseFromSeries}
                        disabled={purchasing || !currentUserAddress}
                        className="w-full"
                        size="lg"
                      >
                        {purchasing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Purchasing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Buy Unique NFT
                          </>
                        )}
                      </Button>
                      
                      {!currentUserAddress && (
                        <div className="text-xs text-muted-foreground text-center">
                          Connect your wallet to purchase
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Owner Info */}
              {!isSeriesView && tokenOwner && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Current Owner</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {tokenOwner.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{formatAddress(tokenOwner)}</div>
                        {isOwner && (
                          <div className="text-sm text-green-600">You own this NFT</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Sell Button for Owner */}
                    {canSell && (
                      <Button 
                        onClick={() => setShowSellModal(true)}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        List for Sale
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Artist Info */}
              {artistProfile && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Artist</h3>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {(artistProfile.artistName || displayData.artist).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{artistProfile.artistName || formatAddress(displayData.artist)}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {artistProfile.bio || "No bio available"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {artistProfile.totalSeriesCreated} series created • {artistProfile.totalNFTsCollected} NFTs collected
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Details */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Technical Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Standard</span>
                      <span>ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockchain</span>
                      <span>Etherlink Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage</span>
                      <span>On-Chain</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Type</span>
                      <span className="uppercase">{displayData.imageType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size</span>
                      <span>{(displayData.imageSize / 1024).toFixed(1)} KB</span>
                    </div>
                    {!isSeriesView && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID</span>
                        <span>#{numericId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Series ID</span>
                                              <span>#{isSeriesView ? numericId : (tokenData?.seriesId || 'N/A')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Sell Modal */}
        {!isSeriesView && canSell && displayData && (
          <SellModal
            isOpen={showSellModal}
            onClose={() => setShowSellModal(false)}
            tokenId={numericId}
            title={displayData.title}
            imageType={displayData.imageType}
          />
        )}
      </MainContainer>
    </WhitelistGuard>
  );
} 