"use client";

import { useConnect, useActiveWallet, useDisconnect } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, ExternalLink } from "lucide-react";
import { useState } from "react";

interface WalletConnectProps {
  onConnect?: () => void;
  triggerText?: string;
  showCard?: boolean;
}

export function WalletConnect({ 
  onConnect, 
  triggerText = "Connect Wallet",
  showCard = false 
}: WalletConnectProps) {
  const { connect, isConnecting } = useConnect();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = async (walletType: 'metamask' | 'google') => {
    try {
      await connect(async () => {
        if (walletType === 'metamask') {
          // Create MetaMask wallet
          const metamask = createWallet("io.metamask");
          // Connect the wallet
          await metamask.connect({ client });
          // Return the wallet
          return metamask;
        } else {
          // Create Google in-app wallet
          const googleWallet = inAppWallet({
            auth: {
              options: ["google"],
            },
          });
          // Connect with Google auth
          await googleWallet.connect({
            client,
            strategy: "google",
          });
          // Return the wallet
          return googleWallet;
        }
      });
      
      onConnect?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = async () => {
    if (activeWallet) {
      await disconnect(activeWallet);
    }
  };

  // If wallet is connected, show disconnect option
  if (activeWallet) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-green-400">
          Wallet Connected
        </div>
        <Button variant="ghost" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  // Card version for the main page
  if (showCard) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to start creating, collecting, and trading digital art on Etherlink.
          </p>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Connect Wallet</DialogTitle>
                <DialogDescription>
                  Choose your preferred wallet to connect to Permalink on Etherlink
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleConnect('metamask')}
                  disabled={isConnecting}
                >
                  <div className="mr-3 h-6 w-6 bg-orange-500 rounded-md flex items-center justify-center">
                    🦊
                  </div>
                  MetaMask
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleConnect('google')}
                  disabled={isConnecting}
                >
                  <div className="mr-3 h-6 w-6 bg-blue-500 rounded-md flex items-center justify-center">
                    G
                  </div>
                  Google Account
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                By connecting a wallet, you agree to our Terms of Service and Privacy Policy.
              </p>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Button version for toolbar/navbar
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect to Permalink on Etherlink
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleConnect('metamask')}
            disabled={isConnecting}
          >
            <div className="mr-3 h-6 w-6 bg-orange-500 rounded-md flex items-center justify-center">
              🦊
            </div>
            MetaMask
            <ExternalLink className="ml-auto h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleConnect('google')}
            disabled={isConnecting}
          >
            <div className="mr-3 h-6 w-6 bg-blue-500 rounded-md flex items-center justify-center">
              G
            </div>
            Google Account
            <ExternalLink className="ml-auto h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          By connecting a wallet, you agree to our Terms of Service and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
} 