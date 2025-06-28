"use client";

import { ArrowLeft, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface ToolbarProps {
  title: string;
  showBackButton?: boolean;
  isWalletConnected?: boolean;
  onWalletConnect?: () => void;
}

export function Toolbar({ 
  title, 
  showBackButton = false, 
  isWalletConnected = false,
  onWalletConnect 
}: ToolbarProps) {
  return (
    <div className="fixed left-0 top-0 backdrop-blur-xl w-screen  bg-background z-50 px-5 lg:px-8 py-4 lg:py-6 border-b border-border flex items-center justify-between">
      <div className="flex items-center flex-1">
        {showBackButton && (
          <Button variant="ghost" size="sm" asChild className="mr-2 lg:mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Link>
          </Button>
        )}
      </div>

      <h1 className="text-xl lg:text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">
        {title}
      </h1>

      <div className="flex items-center flex-1 justify-end">
        {!showBackButton ? (
          <Link href="/main">
            <Button variant="ghost" size="sm" className="lg:text-base">Demo App</Button>
          </Link>
        ) : (
          <div className="flex items-center space-x-2 lg:space-x-4">
            {isWalletConnected ? (
              <Link href="/artist">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-muted cursor-pointer" />
              </Link>
            ) : (
              <Button variant="ghost" size="sm" onClick={onWalletConnect} className="lg:text-base">
                Log in
              </Button>
            )}

            {/* Desktop Navigation - show menu items directly on large screens */}
            <div className="hidden lg:flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/main">Home</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/artist">Profile</Link>
              </Button>
              {isWalletConnected && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/create">Create</Link>
                </Button>
              )}
            </div>

            {/* Mobile Dropdown Menu */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/main" className="flex items-center">
                      <span className="mr-2">🏠</span> Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/artist" className="flex items-center">
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {isWalletConnected && (
                    <DropdownMenuItem asChild>
                      <Link href="/create" className="flex items-center">
                        <span className="mr-2">➕</span> Create
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              
            </div>
          </div>
        )}      
        
        {/* Sync Indicator */}
        <div className="">
          <div className={`px-3 py-2 rounded-full text-xs border ${
            isWalletConnected 
              ? 'text-green-400 border-green-400 cursor-pointer' 
              : 'text-muted-foreground border-ring'
          }`}>
            {isWalletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
          </div>
        </div>
      </div>
    </div>
  );
} 