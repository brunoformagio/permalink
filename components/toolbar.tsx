"use client";

import { ArrowLeft, House, Menu, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import { useActiveWallet } from "thirdweb/react";
import { usePathname } from "next/navigation";
interface ToolbarProps {
  title: string;
  showBackButton?: boolean;
  isWalletConnected?: boolean; // Keep for backwards compatibility but derive from thirdweb
}

export function Toolbar({ 
  title, 
  showBackButton = false 
}: ToolbarProps) {
  const activeWallet = useActiveWallet();
  const isWalletConnected = !!activeWallet;
  const pathname = usePathname();
  const isPathArtist = pathname === "/artist";
  const isPathMain = pathname === "/main";
  const isPathCreate = pathname === "/create";
  // const isPathMarketplace = pathname === "/marketplace";          

  return (
    <div className="fixed backdrop-blur-lg left-0 w-screen top-0 bg-black/80 z-50 px-5 lg:px-8 py-4 lg:py-6 border-b border-border flex items-center justify-between">
      <div className="flex items-center flex-1">
        {showBackButton && (
          <Button variant="ghost" size="sm" asChild className="mr-2 lg:mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Link>
          </Button>
        )}
      </div>

      <h1 className="text-xl text-[var(--permalink-pink)] lg:text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">
        {title}
      </h1>

      <div className="flex items-center flex-1 justify-end">
        {!showBackButton ? (
          <Link href="/main">
            <Button variant="ghost" size="sm" className="lg:text-base">Demo App</Button>
          </Link>
        ) : (
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Wallet Connection / User Profile */}
            {isWalletConnected ? (
              <Link href="/artist">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-muted cursor-pointer" />
              </Link>
            ) : null}


            {/* Desktop Navigation - show menu items directly on large screens */}
            <div className="hidden lg:flex items-center space-x-2">
              <Button variant={isPathMain ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/main">Home</Link>
              </Button>
              <Button variant={isPathArtist ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/artist">Profile</Link>
              </Button>
              {isWalletConnected && (
                <Button variant={isPathCreate ? "secondary" : "ghost"} size="sm" asChild>
                  <Link href="/create">Create</Link>
                </Button>
              )}
            </div>

            {/* Mobile Dropdown Menu */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4 text-[var(--permalink-pink)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 ">
                  <DropdownMenuItem asChild>
                    <Link href="/main" className="flex items-center">
                      <span className="mr-2"><House className="h-4 w-4" /></span> Home
                    </Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild>
                    <Link href="/marketplace" className="flex items-center">
                      <span className="mr-2"><TrendingUp className="h-4 w-4" /></span> Marketplace
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem asChild>
                    <Link href="/artist" className="flex items-center">
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {isWalletConnected && (
                    <DropdownMenuItem asChild>
                      <Link href="/create" className="flex items-center">
                        <span className="mr-2"><Plus className="h-4 w-4" /></span> Create
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>


            {/* Native thirdweb ConnectButton - Mobile (avatar only) */}
            <div className="lg:hidden">
              <ConnectButton
                client={client}
                connectModal={{
                  size: "compact",
                  title: "Connect Wallet",
                  welcomeScreen: {
                    title: "Connect to Permalink",
                    subtitle: "Connect your wallet to start creating, collecting, and trading digital art on Etherlink",
                  },
                }}
                connectButton={{
                    label: "Log in",
                    style: {
                      height: "32px",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "80px",
                    }
                }}
                detailsButton={{
                  render: () => (
                    <div className="w-8 h-8 rounded-full border !border-[var(--permalink-pink)] flex items-center justify-center cursor-pointer">
                      <User className="w-4 h-4 text-[var(--permalink-pink)]" />
                    </div>
                  )
                }}
                appMetadata={{
                  name: "Permalink",
                }}
              />
            </div>

            {/* Native thirdweb ConnectButton - Desktop */}
            <div className="hidden lg:block">
              <ConnectButton
                client={client}
                connectModal={{
                  size: "compact",
                  title: "Connect Wallet",
                  welcomeScreen: {
                    title: "Connect to Permalink",
                    subtitle: "Connect your wallet to start creating, collecting, and trading digital art on Etherlink",
                  },
                }}
                connectButton={{
                  label: "Log in",
                  style: {
                    height: "32px",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "80px",
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 