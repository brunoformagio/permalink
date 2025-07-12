"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { readContract } from "thirdweb";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPermalinkContract } from "@/lib/contract-config";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";

interface WhitelistGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WhitelistGuard({ children, fallback }: WhitelistGuardProps) {
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [whitelistEnabled, setWhitelistEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const account = useActiveAccount();
  const router = useRouter();

  const contract = getPermalinkContract();

  useEffect(() => {
    const checkWhitelist = async () => {
      try {
        // First check if whitelist is enabled
        const enabled = await readContract({
          contract,
          method: "function isWhitelistEnabled() view returns (bool)",
          params: [],
        });

        setWhitelistEnabled(enabled);

        // If whitelist is disabled, allow everyone
        if (!enabled) {
          setIsWhitelisted(true);
          setIsLoading(false);
          return;
        }

        // If whitelist is enabled, check user's wallet and whitelist status
        if (!account) {
          setIsLoading(false);
          setIsWhitelisted(false);
          return;
        }

        const whitelisted = await readContract({
          contract,
          method: "function isWhitelisted(address) view returns (bool)",
          params: [account.address],
        });

        setIsWhitelisted(whitelisted);
        
        if (!whitelisted) {
          toast.error("You are not whitelisted. Please register interest on the landing page.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking whitelist:", error);
        setIsWhitelisted(false);
        toast.error("Error checking whitelist status. Please try again.");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkWhitelist();
  }, [account, contract, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!account && whitelistEnabled) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Wallet Required</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access this page.
            </p>
            <ConnectButton
              client={client}
              wallets={[
                createWallet("io.metamask"),
                inAppWallet({
                  auth: {
                    options: ["google"],
                  },
                }),
              ]}
              theme="dark"
            />
          </div>
        </div>
      )
    );
  }

  if (isWhitelisted === false) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              You are not whitelisted. Please register interest on the landing page.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
} 