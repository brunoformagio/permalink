"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveWallet } from "thirdweb/react";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/wallet-connect";
import { User, Wallet } from "lucide-react";

export default function ArtistRedirectPage() {
  const router = useRouter();
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;

  useEffect(() => {
    // If wallet is connected, redirect to user's artist profile
    if (currentUserAddress) {
      router.push(`/artist/${currentUserAddress}`);
    }
  }, [currentUserAddress, router]);

  // If wallet is connected, show loading while redirecting
  if (currentUserAddress) {
    return (
      <MainContainer>
        <Toolbar title="Artist Profile" showBackButton={true} isWalletConnected={true} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Redirecting to your artist profile...</p>
          </div>
        </div>
      </MainContainer>
    );
  }

  // If no wallet connected, show connect wallet page
  return (
    <MainContainer>
      <Toolbar title="Artist Profile" showBackButton={true} isWalletConnected={false} />
      
      <div className="animate-fade-in p-5 lg:px-8">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            To view your artist profile, you need to connect your wallet first. 
            Your profile will be automatically created based on your wallet address.
          </p>

          <div className="space-y-4">
            <WalletConnect showCard={true} />
            
            <div className="text-center">
              <div className="inline-flex items-center text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                <Wallet className="h-4 w-4 mr-2" />
                Your wallet address becomes your artist profile URL
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-semibold mb-3">What you can do with your artist profile:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li>• View all artworks you&apos;ve created</li>
              <li>• See your collected NFTs</li>
              <li>• Share your profile with others</li>
              <li>• Update your artist information</li>
            </ul>
          </div>

          <div className="mt-8">
            <Button 
              variant="outline" 
              onClick={() => router.push('/main')}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </MainContainer>
  );
} 