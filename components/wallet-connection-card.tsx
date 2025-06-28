"use client";

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
import { useState } from "react";

interface WalletConnectionCardProps {
  onConnect: () => void;
}

export function WalletConnectionCard({ onConnect }: WalletConnectionCardProps) {
  const [open, setOpen] = useState(false);

  const handleConnect = () => {
    setOpen(false);
    // Simulate wallet connection delay
    setTimeout(() => {
      onConnect();
    }, 1000);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6 text-center">
        <h3 className="text-xl font-semibold mb-3">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-6">
          Sync your wallet to access premium features
        </p>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Connect Wallet</Button>
          </DialogTrigger>
          <DialogContent className="animate-fade-in-modal">
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>
                Connect with one of our available wallet providers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button className="w-full" onClick={handleConnect}>
                MetaMask
              </Button>
              <Button className="w-full" onClick={handleConnect}>
                WalletConnect
              </Button>
              <Button className="w-full" onClick={handleConnect}>
                Coinbase Wallet
              </Button>
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 