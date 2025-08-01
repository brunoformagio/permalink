"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropCard } from "@/components/drop-card";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { Copy, Edit } from "lucide-react";
import { 
  getArtistProfile, 
  getArtistSeries, 
  getArtworkSeries,
  getCollectorTokens,
  getIndividualArtwork,
  formatAddress,
  isValidAddress,
  type ArtistProfile,
  type ArtworkSeries,
  type IndividualArtwork
} from "@/lib/contractERC721";
import { WhitelistGuard } from "@/components/whitelist-guard";
import Image from "next/image";
import { 
  formatTimeRemaining,
  type ListingERC721, 
  type OfferERC721 
} from "@/lib/marketplaceERC721";
import { TrendingUp, Tag, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function DynamicArtistPage() {
  const params = useParams();
  const address = params.address as string;
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;
  const router = useRouter();
  
  // Extended interface for collected tokens with tokenId
  interface CollectedToken extends IndividualArtwork {
    tokenId: number;
  }

  // Extended interface for created series with seriesId
  interface CreatedSeries extends ArtworkSeries {
    seriesId: number;
  }

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [createdArtworks, setCreatedArtworks] = useState<CreatedSeries[]>([]);
  const [collectedArtworks, setCollectedArtworks] = useState<CollectedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userListings, setUserListings] = useState<ListingERC721[]>([]);
  const [userOffers, setUserOffers] = useState<OfferERC721[]>([]);
  const [, setMarketplaceLoading] = useState(false);

  const isOwnProfile = currentUserAddress?.toLowerCase() === address?.toLowerCase();

  const fetchArtistData = useCallback(async () => {
    if (!address || !isValidAddress(address)) {
      setError("Invalid wallet address");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Clear previous data to prevent stale state
      setProfile(null);
      setCreatedArtworks([]);
      setCollectedArtworks([]);

      // Fetch artist profile
      const artistProfile = await getArtistProfile(address);
      setProfile(artistProfile);

      // Fetch created artwork series
      const createdSeriesIds = await getArtistSeries(address);
      const createdArtworks: CreatedSeries[] = [];
      for (const seriesId of createdSeriesIds) {
        const series = await getArtworkSeries(seriesId);
        if (series) {
          createdArtworks.push({ ...series, seriesId });
        }
      }
      setCreatedArtworks(createdArtworks);

      // Fetch collected tokens and their details
      const collectedTokenIds = await getCollectorTokens(address);
      const collectedTokens: CollectedToken[] = [];
      for (const tokenId of collectedTokenIds) {
        const tokenData = await getIndividualArtwork(tokenId);
        if (tokenData) {
          // Add the token ID to the token data for easier reference
          collectedTokens.push({ ...tokenData, tokenId });
        }
      }
      setCollectedArtworks(collectedTokens);

    } catch (err) {
      console.error("Error fetching artist data:", err);
      setError("Failed to load artist data");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const loadMarketplaceData = async () => {
    if (!address) return;
    
    try {
      setMarketplaceLoading(true);
      // For now, set empty arrays - marketplace user functions need to be implemented
      // TODO: Implement getUserListingsERC721 and getUserOffersERC721 functions
      setUserListings([]);
      setUserOffers([]);
    } catch (error) {
      console.error("Error loading marketplace data:", error);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  useEffect(() => {
    fetchArtistData();
    loadMarketplaceData();
  }, [address, fetchArtistData]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleEditProfile = () => {
    setEditModalOpen(true);
  };

  const handleProfileUpdated = async () => {
    // Refresh the artist data after profile update
    try {
      await fetchArtistData();
    } catch (error) {
      console.error("Error refreshing artist data:", error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  if (loading) {
    return (
      <WhitelistGuard>
        <MainContainer>
        <Toolbar title="Loading..." showBackButton={true} isWalletConnected={!!currentUserAddress} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading artist profile...</p>
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
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </MainContainer>
      </WhitelistGuard>
    );
  }

  return (
    <WhitelistGuard>
      <MainContainer>
        <Toolbar 
          title={profile?.artistName || formatAddress(address)} 
          showBackButton={true} 
          isWalletConnected={!!currentUserAddress} 
        />

        <div className="animate-fade-in">
          {/* Desktop Layout */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:p-8">
            {/* Artist Header - Spans full width on mobile, left column on desktop */}
            <div className="lg:col-span-4">
              <div className="text-center lg:text-left py-8 px-5 lg:px-0 border-b lg:border-b-0 border-border">
                {/* Avatar */}
                <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-full bg-muted border mx-auto lg:mx-0 mb-4 lg:mb-6 flex items-center justify-center overflow-hidden">
                  {profile?.avatarURI ? (
                    <Image 
                      unoptimized={true}
                      src={profile.avatarURI} 
                      alt={profile.artistName || "Artist avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm">No Avatar</div>
                  )}
                </div>

                {/* Artist Name */}
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                  {profile?.artistName || "Unregistered Artist"}
                </h1>
                
                {/* Address */}
                <div className="inline-flex items-center bg-secondary text-muted-foreground px-3 py-2 rounded-lg text-sm font-mono mb-4 lg:mb-6">
                  <span>{formatAddress(address)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-3 p-0 h-auto text-muted-foreground hover:text-foreground"
                    onClick={copyAddress}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* Bio */}
                <p className="text-muted-foreground text-sm lg:text-base mb-6 lg:mb-8 leading-relaxed">
                  {profile?.bio || "No bio available"}
                </p>

                {/* Registration Status */}
                {!profile?.isRegistered && (
                  <div className="mb-6 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-orange-600 text-sm">
                      This artist hasn&apos;t registered a profile yet.
                    </p>
                    {isOwnProfile && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleEditProfile}
                        className="mt-3 w-full lg:hidden"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Create Profile
                      </Button>
                    )}
                  </div>
                )}

                {/* Mobile Edit Button for Registered Users */}
                {profile?.isRegistered && isOwnProfile && (
                  <div className="mb-6 lg:hidden">
                    <Button 
                      variant="outline" 
                      onClick={handleEditProfile}
                      className="w-full"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div className="text-center lg:text-left">
                    <span className="text-3xl font-bold">{profile?.totalSeriesCreated || createdArtworks.length}</span>
                    <span className="text-sm text-muted-foreground">Series Created</span>
                  </div>
                  <div className="text-center lg:text-left">
                    <span className="text-3xl font-bold">{profile?.totalNFTsCollected || collectedArtworks.length}</span>
                    <span className="text-sm text-muted-foreground">NFTs Collected</span>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:block mt-8 space-y-3">
                  {isOwnProfile ? (
                    <Button variant="outline" className="w-full" onClick={handleEditProfile}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Share Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area - Right side on desktop */}
            <div className="lg:col-span-8">
              <div className="px-5 lg:px-0 py-6 lg:py-0">
                <Tabs defaultValue="created" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 lg:mb-8">
                    <TabsTrigger value="created" className="lg:text-base">
                      Created ({createdArtworks.length})
                    </TabsTrigger>
                    <TabsTrigger value="collected" className="lg:text-base">
                      Collected ({collectedArtworks.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="created" className="mt-6">
                    {createdArtworks.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        {createdArtworks.map((artwork, index) => (
                          <DropCard 
                            key={index} 
                                                          drop={{
                                id: `series-${artwork.seriesId}`,
                                title: artwork.title,
                                artist: "Created",
                                price: `${artwork.price} XTZ`,
                                image: artwork.description || `Series #${artwork.seriesId}`,
                                imageUri: '', // On-chain storage
                                supply: `${artwork.minted}/${artwork.maxSupply} minted`,
                                isZip: artwork.imageType === 'zip',
                                seriesId: artwork.seriesId
                              }}
                            onClick={() => router.push(`/item/series-${artwork.seriesId}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">
                          {isOwnProfile ? "You haven&apos;t created any artwork series yet." : "This artist hasn&apos;t created any artwork series yet."}
                        </p>
                        {isOwnProfile && (
                          <div className="space-y-3">
                            <Button variant="outline" onClick={() => window.location.href = '/create'}>
                              Create Your First Series
                            </Button>
                            <Button variant="outline" onClick={handleEditProfile} className="lg:hidden">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Profile
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="collected" className="mt-6">
                    {collectedArtworks.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        {collectedArtworks.map((token, index) => (
                          <DropCard 
                            key={index} 
                            drop={{
                              id: token.tokenId.toString(),
                              title: token.title,
                              artist: formatAddress(token.artist),
                              price: `Token #${token.tokenId}`,
                              image: token.description || `Token #${token.tokenId}`,
                              imageUri: '', // On-chain storage
                              supply: `Minted ${new Date(token.mintedAt * 1000).toLocaleDateString()}`,
                              isZip: token.imageType === 'zip',
                              tokenId: token.tokenId
                            }}
                            onClick={() => router.push(`/item/${token.tokenId}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          {isOwnProfile ? "You haven&apos;t collected any NFTs yet." : "This collector doesn&apos;t have any public NFTs."}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Marketplace Activity */}
              {(userListings.length > 0 || userOffers.length > 0) && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Marketplace Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="listings" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="listings">
                          <Tag className="h-4 w-4 mr-2" />
                          Listings ({userListings.length})
                        </TabsTrigger>
                        <TabsTrigger value="offers">
                          <Gavel className="h-4 w-4 mr-2" />
                          Offers ({userOffers.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="listings" className="mt-4">
                        {userListings.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No active listings
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userListings.map((listing) => (
                              <div key={listing.listingId} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <div className="font-semibold">Token #{listing.tokenId}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {listing.price} XTZ
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/item/${listing.tokenId}`)}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="offers" className="mt-4">
                        {userOffers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No active offers
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userOffers.map((offer) => (
                              <div key={offer.offerId} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <div className="font-semibold">Token #{offer.tokenId}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {offer.price} XTZ
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Expires in {formatTimeRemaining(offer.expiresAt)}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/item/${offer.tokenId}`)}
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Copy Notification */}
        {copiedAddress && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card border border-border px-4 py-2 rounded-lg text-sm z-50">
            Address copied to clipboard!
          </div>
        )}

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={profile ? {
            ...profile,
            totalCreated: profile.totalSeriesCreated,
            totalCollected: profile.totalNFTsCollected
          } : null}
          onProfileUpdated={handleProfileUpdated}
        />
      </MainContainer>
    </WhitelistGuard>
  );
} 