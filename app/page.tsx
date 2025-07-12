"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Network, Database, Users, Wallet, Check } from "lucide-react";
import { useActiveAccount, useAutoConnect, ConnectButton } from "thirdweb/react";
import { readContract } from "thirdweb";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { toast } from "sonner";
import { WalletConnect } from "@/components/wallet-connect";
import { getPermalinkContract } from "@/lib/contract-config";
import { client } from "@/lib/thirdweb";
import { createWallet, inAppWallet } from "thirdweb/wallets";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [whitelistEnabled, setWhitelistEnabled] = useState<boolean | null>(null);
  const [isAlreadyInterested, setIsAlreadyInterested] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const isCheckingRef = useRef(false);
  const account = useActiveAccount();

  // Auto-connect to handle wallet persistence
  const { data: autoConnected, isLoading: isAutoConnecting } = useAutoConnect({
    client,
    wallets: [
      createWallet("io.metamask"),
      inAppWallet({
        auth: {
          options: ["google"],
        },
      }),
    ],
    timeout: 15000,
  });

  const contract = getPermalinkContract();

  useEffect(() => {
    const checkWhitelistStatus = async () => {
      try {
        const enabled = await readContract({
          contract,
          method: "function isWhitelistEnabled() view returns (bool)",
          params: [],
        });
        setWhitelistEnabled(enabled);
      } catch (error) {
        console.error("Error checking whitelist status:", error);
        // Default to enabled if we can't check
        setWhitelistEnabled(true);
      }
    };

    checkWhitelistStatus();
  }, [contract]);

  // Check user's registration status when account changes
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!account || isCheckingRef.current) {
        if (!account) {
          setIsAlreadyInterested(false);
          setIsWhitelisted(false);
          setCheckingStatus(false);
          isCheckingRef.current = false;
        }
        return;
      }

      isCheckingRef.current = true;
      setCheckingStatus(true);
      
      try {
        const [whitelistedStatus, interestedStatus] = await Promise.all([
          readContract({
            contract,
            method: "function isWhitelisted(address) view returns (bool)",
            params: [account.address],
          }),
          readContract({
            contract,
            method: "function isInterested(address) view returns (bool)",
            params: [account.address],
          }),
        ]);

        setIsWhitelisted(whitelistedStatus);
        setIsAlreadyInterested(interestedStatus);
      } catch (error) {
        console.error("Error checking user status:", error);
        setIsAlreadyInterested(false);
        setIsWhitelisted(false);
      } finally {
        setCheckingStatus(false);
        isCheckingRef.current = false;
      }
    };

    checkUserStatus();
  }, [account?.address]); // Only depend on account address to prevent unnecessary re-runs

  const handleEarlyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (isWhitelisted) {
      toast.success("You're already whitelisted! You can access the platform.");
      return;
    }

    if (isAlreadyInterested) {
      toast.info("You've already registered interest. Please wait for approval.");
      return;
    }

    setIsLoading(true);
    
    try {
      // Register interest
      const transaction = prepareContractCall({
        contract,
        method: "function registerInterest()",
        params: [],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      toast.success("Successfully registered interest! You'll be notified when approved.");
      setIsAlreadyInterested(true); // Update state to reflect registration
    } catch (error) {
      console.error("Error registering interest:", error);
      toast.error("Failed to register interest. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Registering...
        </>
      );
    }

    if (isWhitelisted) {
      return "Already Whitelisted!";
    }

    if (isAlreadyInterested) {
      return <span className="flex items-center gap-2">Register sent <Check className="w-4 h-4"/></span>;
    }

    return "Register Interest";
  };

  return (
    <>
            <header className="flex justify-between items-center py-4 lg:py-6 border-b border-border ">
          <div className="flex items-center w-full justify-between mx-auto px-10 container">
          <div className="text-2xl lg:text-3xl flex items-center gap-2 text-[#47c89f]">
            <Image src="/permalink-logo-symbol.svg" alt="Permalink Logo" width={32} height={32} />
            <span className="hidden sm:block"><span className="font-semibold">Perma</span>link</span>
            </div>
          <div className="flex items-center gap-4">
            <Link href="/main">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Access App
              </Button>
            </Link>
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
          </div></div>
        </header>
        <div className="bg-[url('/banner.png')] bg-contain bg-top !bg-no-repeat">
    <div className="container-responsive  ">
      <div className="animate-fade-in p-5 lg:px-8 min-h-screen">
        {/* Header */}


        {/* Hero Section */}
        <section className=" text-center py-15 lg:py-20 max-w-4xl mx-auto">
          <h1 className="text-5xl lg:text-7xl font-extrabold mb-4 lg:mb-6 tracking-tight">
            Generative Art on Etherlink
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 lg:mb-12 leading-relaxed max-w-2xl mx-auto">
            Create, collect, and trade unique generative digital art.
          </p>
        </section>

        {/* Early Access Form */}
        <div className="max-w-md lg:max-w-lg mx-auto mb-10 lg:mb-16">
          <Card>
            <CardContent className="p-6 lg:p-8 text-center">
              {whitelistEnabled === false ? (
                <>
                  <h2 className="text-xl lg:text-2xl font-semibold mb-3">Platform Now Public!</h2>
                  <p className="text-muted-foreground mb-6">
                    The Permalink platform is now open to everyone. Connect your wallet and start exploring!
                  </p>
                  <Link href="/main">
                    <Button className="w-full">
                      Enter Platform
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-xl lg:text-2xl font-semibold mb-3">Get Early Access</h2>
                  <p className="text-muted-foreground mb-6">
                    Connect your wallet to register interest in early access and stay tuned in our <a href="https://x.com/permalinkart" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">X's account</a>, we will notify when the platform is live!
                  </p>
              
              {isAutoConnecting ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <div className="text-sm text-muted-foreground">
                      Restoring wallet connection...
                    </div>
                  </div>
                </div>
              ) : !account ? (
                <div className="space-y-4">
                  <div className="text-muted-foreground text-sm">
                    Connect your wallet to register for early access
                  </div>
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
                    connectButton={{ label: "Connect Wallet" }}
                    connectModal={{ size: "compact" }}
                  />
                </div>
              ) : (
                <form onSubmit={handleEarlyAccess} className="space-y-4">
                  
                  {checkingStatus ? (
                    <div className="flex items-center justify-center space-x-2 py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <div className="text-sm text-muted-foreground">
                        Checking registration status...
                      </div>
                    </div>
                  ) : (
                    <>
                      {isWhitelisted && (
                        <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded-lg">
                          ✅ You're already whitelisted! You can access the platform.
                        </div>
                      )}
                      
                     </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || checkingStatus || isAlreadyInterested || isWhitelisted}
                    variant={isAlreadyInterested || isWhitelisted ? "secondary" : "default"}
                  >
                    {getButtonContent()}
                  </Button>
                </form>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <section className="mb-15 lg:mb-20">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-8 text-center lg:text-left">
            Features
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <Sparkles className="mr-3 h-7 w-7" />
                  Algorithmic Creation
                </h3>
                <p className="text-muted-foreground text-sm lg:text-base">
                  Harness the power of generative algorithms to create unique, one-of-a-kind digital artworks that push the boundaries of creativity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <Network className="mr-3 h-7 w-7" />
                  Decentralized Platform
                </h3>
                <p className="text-muted-foreground text-sm lg:text-base">
                  Built on Etherlink&apos;s robust infrastructure, ensuring true ownership, transparency, and permanence for your digital art collection.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <Database className="mr-3 h-7 w-7" />
                  Stored Onchain
                </h3>
                <p className="text-muted-foreground text-sm lg:text-base">
                  Your artwork metadata and provenance are permanently stored on-chain, guaranteeing authenticity and eternal accessibility.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <Users className="mr-3 h-7 w-7" />
                  Artist-First Approach
                </h3>
                <p className="text-muted-foreground text-sm lg:text-base">
                  Empowering creators with fair royalties, easy minting tools, and a supportive community that values artistic innovation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-15 lg:mb-20">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4 lg:mb-8 text-center lg:text-left">Team</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
            <Card>
              <CardContent className="p-4 lg:p-6 flex items-center">
                <Image
                  src="/team/bruno-avatar.png"
                  alt="Bruno Formagio"
                  width={64}
                  height={64}
                  className="w-12 h-12 lg:w-16 lg:h-16 rounded-full mr-4 lg:mr-6 flex-shrink-0 object-cover"
                />
                <div>
                  <div className="font-semibold lg:text-lg">Bruno Formagio</div>
                  <div className="text-muted-foreground text-sm lg:text-base leading-tight">
                    Digital artist and blockchain developer passionate about merging generative algorithms with decentralized technologies to create new forms of artistic expression.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 lg:p-6 flex items-center">
                <Image
                  src="/team/ff-avatar.jpg"
                  alt="FromFriends™"
                  width={64}
                  height={64}
                  className="w-12 h-12 lg:w-16 lg:h-16 rounded-full mr-4 lg:mr-6 flex-shrink-0 object-cover"
                />
                <div>
                  <div className="font-semibold lg:text-lg">FromFriends™</div>
                  <div className="text-muted-foreground text-sm lg:text-base leading-tight">
                    Creative developer focused on building innovative platforms that empower artists and creators in the Web3 ecosystem through thoughtful design and technology.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div></div></>
  );
}
