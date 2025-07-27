"use client";

import { useState } from "react";
import { useActiveWallet } from "thirdweb/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, DollarSign, Gavel } from "lucide-react";
import { toast } from "sonner";
import {
  isMarketplaceApprovedERC721,
  approveMarketplaceERC721,
  createListingERC721,
} from "@/lib/marketplaceERC721";
import { getAccountFromWallet } from "@/lib/contractERC721";

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
  title: string;
  imageType: string;
}

export function SellModal({
  isOpen,
  onClose,
  tokenId,
  title,
  imageType,
}: SellModalProps) {
  const activeWallet = useActiveWallet();
  const [step, setStep] = useState<"input" | "approve" | "listing">("input");
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsApproved] = useState(false);

  const currentUserAddress = activeWallet?.getAccount()?.address;

  const handleClose = () => {
    setStep("input");
    setPrice("");
    setIsLoading(false);
    setIsApproved(false);
    onClose();
  };

  const checkApproval = async () => {
    if (!currentUserAddress) return false;
    
    try {
      const approved = await isMarketplaceApprovedERC721(currentUserAddress, tokenId);
      setIsApproved(approved);
      return approved;
    } catch (error) {
      console.error("Error checking approval:", error);
      return false;
    }
  };

  const handleSell = async () => {
    if (!activeWallet || !currentUserAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setIsLoading(true);

      // Check if marketplace is approved
      const approved = await checkApproval();
      
      if (!approved) {
        setStep("approve");
        toast.loading("Approving marketplace...", { id: "approve-tx" });
        
        const account = getAccountFromWallet(activeWallet);
        if (!account) {
          toast.error("Unable to get account from wallet", { id: "approve-tx" });
          return;
        }

        const approveResult = await approveMarketplaceERC721(account, tokenId);
        
        if (!approveResult.success) {
          toast.error(approveResult.error || "Failed to approve marketplace", { id: "approve-tx" });
          return;
        }

        toast.success("Marketplace approved!", { id: "approve-tx" });
        setIsApproved(true);
      }

      // Create listing
      setStep("listing");
      toast.loading("Creating listing...", { id: "listing-tx" });

      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get account from wallet", { id: "listing-tx" });
        return;
      }

      const listingResult = await createListingERC721(account, tokenId, price);

      if (listingResult.success) {
        toast.success("NFT listed successfully!", { id: "listing-tx" });
        
        if (listingResult.txHash) {
          toast.success(
            `Listing created! Hash: ${listingResult.txHash.slice(0, 10)}...`,
            {
              action: {
                label: "View on Explorer",
                onClick: () => window.open(
                  `https://testnet.explorer.etherlink.com/tx/${listingResult.txHash}`,
                  '_blank'
                )
              },
              duration: 15000,
            }
          );
        }

        // Close modal and potentially refresh page
        handleClose();
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        toast.error(listingResult.error || "Failed to create listing", { id: "listing-tx" });
      }

    } catch (error) {
      console.error("Error selling NFT:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Sell NFT
          </DialogTitle>
          <DialogDescription>
            List your NFT &quot;{title}&quot; on the marketplace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "input" && (
            <>
              {/* NFT Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                      {imageType === 'zip' ? '🎨' : '🖼️'}
                    </div>
                    <div>
                      <div className="font-medium">{title}</div>
                      <div className="text-sm text-muted-foreground">Token #{tokenId}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Input */}
              <div className="space-y-2">
                <Label htmlFor="price">Listing Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.001"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    XTZ
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set your desired selling price in XTZ
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSell} 
                  disabled={isLoading || !price || parseFloat(price) <= 0}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      List for Sale
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "approve" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Approving Marketplace</h3>
                <p className="text-sm text-muted-foreground">
                  Please approve the marketplace contract to manage your NFTs. This is a one-time approval.
                </p>
              </div>
            </div>
          )}

          {step === "listing" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Creating Listing</h3>
                <p className="text-sm text-muted-foreground">
                  Creating your marketplace listing for {price} XTZ...
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 