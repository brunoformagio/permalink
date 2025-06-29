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
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type ArtistProfile, updateArtistProfileV5, getAccountFromWallet } from "@/lib/contract";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ArtistProfile | null;
  onProfileUpdated: () => void;
}

export function EditProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  onProfileUpdated 
}: EditProfileModalProps) {
  const activeWallet = useActiveWallet();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: profile?.artistName && profile.artistName !== "NO_NAME" ? profile.artistName : "",
    bio: profile?.bio && profile.bio !== "NO_BIO" ? profile.bio : "",
    avatarURI: profile?.avatarURI || ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeWallet) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      setSaving(true);
      
      // Get account from thirdweb wallet
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get wallet account");
        return;
      }

      // Call the real contract function
      const result = await updateArtistProfileV5(
        account,
        formData.name,
        formData.bio,
        formData.avatarURI
      );
      
      if (result.success) {
        const isCreating = !profile?.isRegistered;
        
        toast.success(
          isCreating 
            ? "Profile created successfully!" 
            : "Profile updated successfully!"
        );
        
        // Show transaction hash with explorer link
        if (result.txHash) {
          console.log("Transaction hash:", result.txHash);
          
          toast.success(
            `Transaction confirmed! Hash: ${result.txHash.slice(0, 10)}...`,
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
        
        // Close modal first
        onClose();
        
        // Show refreshing notification
        toast.loading("Refreshing profile data...", {
          id: "refresh-profile"
        });
        
        // Wait for blockchain confirmation then refresh
        setTimeout(async () => {
          try {
            await onProfileUpdated();
            toast.success("Profile data updated!", {
              id: "refresh-profile"
            });
          } catch (error) {
            console.error("Error refreshing profile:", error);
            toast.error("Profile updated, but refresh failed. Please reload the page.", {
              id: "refresh-profile"
            });
          }
        }, 3000); // Wait 3 seconds for blockchain confirmation
        
      } else {
        toast.error(result.error || "Failed to update profile");
      }
      
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: profile?.artistName && profile.artistName !== "NO_NAME" ? profile.artistName : "",
      bio: profile?.bio && profile.bio !== "NO_BIO" ? profile.bio : "",
      avatarURI: profile?.avatarURI || ""
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isCreating = !profile?.isRegistered;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isCreating ? "Create Artist Profile" : "Edit Artist Profile"}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? "Set up your artist profile to start showcasing your work on Permalink."
              : "Update your artist information and customize your profile."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Artist Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="name">Artist Name *</Label>
              {isCreating && (
                <Badge variant="secondary" className="text-xs">
                  New Profile
                </Badge>
              )}
            </div>
            <Input
              id="name"
              name="name"
              placeholder="Enter your artist name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={saving}
              required
              maxLength={50}
            />
            <div className="text-xs text-muted-foreground">
              This will be displayed as your public artist name
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell the world about your art and inspiration..."
              value={formData.bio}
              onChange={handleInputChange}
              disabled={saving}
              maxLength={500}
              className="min-h-24 resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {formData.bio.length}/500 characters
            </div>
          </div>

          {/* Avatar URI */}
          <div className="space-y-2">
            <Label htmlFor="avatarURI">Avatar URL</Label>
            <Input
              id="avatarURI"
              name="avatarURI"
              type="url"
              placeholder="https://example.com/your-avatar.jpg"
              value={formData.avatarURI}
              onChange={handleInputChange}
              disabled={saving}
            />
            <div className="text-xs text-muted-foreground">
              Optional: Link to your profile picture (JPG, PNG, GIF)
            </div>
          </div>

          {/* Avatar Preview */}
          {formData.avatarURI && (
            <div className="space-y-2">
              <Label>Avatar Preview</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted border overflow-hidden flex items-center justify-center">
                  <img 
                    src={formData.avatarURI} 
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="text-xs text-muted-foreground hidden">
                    Invalid URL
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  This is how your avatar will appear
                </div>
              </div>
            </div>
          )}

          {/* Blockchain Info */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">Blockchain Information</div>
            <div className="text-muted-foreground space-y-1">
              <div>• Profile data is stored permanently on Etherlink</div>
              <div>• Transaction fee: ~0.001 XTZ (varies by network)</div>
              <div>• Updates are public and immutable</div>
              <div>• Your wallet will prompt for confirmation</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {isCreating ? "Creating..." : "Updating..."}
                </>
              ) : (
                isCreating ? "Create Profile" : "Update Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 