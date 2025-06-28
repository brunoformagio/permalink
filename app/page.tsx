"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Network, Database, Users } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");

  const handleEarlyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Thank you for your interest! We've received your information: ${email}`);
    setEmail("");
  };

  return (
    <>
            <header className="flex justify-between items-center py-4 lg:py-6 border-b border-border mb-6 lg:mb-12">
          <div className="flex items-center w-full justify-between mx-auto px-10 container">
          <div className="text-2xl lg:text-3xl font-bold">Permalink</div>
          <Link href="/main">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Demo App
            </Button>
          </Link></div>
        </header>
    <div className="container-responsive ">
      <div className="animate-fade-in p-5 lg:px-8 min-h-screen">
        {/* Header */}


        {/* Hero Section */}
        <section className="text-center py-15 lg:py-20 max-w-4xl mx-auto">
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
              <h2 className="text-xl lg:text-2xl font-semibold mb-3">Get Early Access</h2>
              <p className="text-muted-foreground mb-6">
                Be among the first to explore Permalink when we launch. Join our exclusive early access list.
              </p>
              <form onSubmit={handleEarlyAccess} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter your email or X handle..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-[14px] py-[14px] bg-background border-[#333333] rounded-lg text-white text-base mb-4 h-auto focus-visible:border-[#555555] focus-visible:ring-0"
                />
                <Button 
                  type="submit" 
                  className="w-full"
                >
                  Join Early Access
                </Button>
              </form>
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
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-muted mr-4 lg:mr-6 flex-shrink-0" />
                <div>
                  <div className="font-semibold lg:text-lg">Bruno Formation</div>
                  <div className="text-muted-foreground text-sm lg:text-base leading-tight">
                    Digital artist and blockchain developer passionate about merging generative algorithms with decentralized technologies to create new forms of artistic expression.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 lg:p-6 flex items-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-muted mr-4 lg:mr-6 flex-shrink-0" />
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
    </div></>
  );
}
