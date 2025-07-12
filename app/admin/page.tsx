"use client";

import { useState, useEffect, useRef } from "react";
import { useActiveAccount } from "thirdweb/react";
import { readContract, prepareContractCall, sendTransaction } from "thirdweb";
import { MainContainer } from "@/components/main-container";
import { Toolbar } from "@/components/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserCheck, UserPlus, Shield, Copy, CheckCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { getPermalinkContract } from "@/lib/contract-config";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interestedAddresses, setInterestedAddresses] = useState<string[]>([]);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<string[]>([]);
  const [adminAddresses, setAdminAddresses] = useState<string[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [processing, setProcessing] = useState(false);
  const [whitelistEnabled, setWhitelistEnabled] = useState<boolean | null>(null);
  
  const isCheckingRef = useRef(false);
  const account = useActiveAccount();
  const router = useRouter();

  const contract = getPermalinkContract();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!account || isCheckingRef.current) {
        if (!account) {
          setIsAdmin(false);
          setIsLoading(false);
          isCheckingRef.current = false;
        }
        return;
      }

      isCheckingRef.current = true;
      setIsLoading(true);

      try {
        const adminStatus = await readContract({
          contract,
          method: "function isAdmin(address) view returns (bool)",
          params: [account.address],
        });

        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          toast.error("Access denied. You are not an admin.");
          router.push("/");
          return;
        }

        // Load all addresses if user is admin
        await loadAddresses();
        await loadWhitelistStatus();
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        toast.error("Error checking admin status");
        router.push("/");
      } finally {
        setIsLoading(false);
        isCheckingRef.current = false;
      }
    };

    checkAdminStatus();
  }, [account?.address]); // Only depend on account address

  const loadAddresses = async () => {
    try {
      const [interested, whitelisted, admins] = await Promise.all([
        readContract({
          contract,
          method: "function getInterestedAddresses() view returns (address[])",
          params: [],
        }),
        readContract({
          contract,
          method: "function getWhitelistedAddresses() view returns (address[])",
          params: [],
        }),
        readContract({
          contract,
          method: "function getAdminAddresses() view returns (address[])",
          params: [],
        }),
      ]);

      setInterestedAddresses([...interested]);
      setWhitelistedAddresses([...whitelisted]);
      setAdminAddresses([...admins]);
    } catch (error) {
      console.error("Error loading addresses:", error);
      toast.error("Failed to load addresses");
    }
  };

  const loadWhitelistStatus = async () => {
    try {
      const enabled = await readContract({
        contract,
        method: "function isWhitelistEnabled() view returns (bool)",
        params: [],
      });
      setWhitelistEnabled(enabled);
    } catch (error) {
      console.error("Error loading whitelist status:", error);
      toast.error("Failed to load whitelist status");
    }
  };

  const handleToggleWhitelist = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    setProcessing(true);
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function toggleWhitelist()",
        params: [],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      const newStatus = !whitelistEnabled;
      setWhitelistEnabled(newStatus);
      
      toast.success(`Whitelist ${newStatus ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error("Error toggling whitelist:", error);
      toast.error("Failed to toggle whitelist");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAddresses = async () => {
    if (!account || selectedAddresses.length === 0) {
      toast.error("Please select addresses to approve");
      return;
    }

    setProcessing(true);
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function approveAddresses(address[])",
        params: [selectedAddresses],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      toast.success(`Successfully approved ${selectedAddresses.length} address${selectedAddresses.length > 1 ? 'es' : ''}!`);
      
      // Reload addresses
      await loadAddresses();
      setSelectedAddresses([]);
    } catch (error) {
      console.error("Error approving addresses:", error);
      toast.error("Failed to approve addresses");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!account || !newAdminAddress.trim()) {
      toast.error("Please enter a valid address");
      return;
    }

    // Basic address validation (should start with 0x and be 42 characters)
    if (!newAdminAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    setProcessing(true);
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function addAdmin(address)",
        params: [newAdminAddress],
      });

      const result = await sendTransaction({
        transaction,
        account,
      });

      toast.success("Successfully added new admin!");
      
      // Reload addresses
      await loadAddresses();
      setNewAdminAddress("");
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add admin");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAddress = (address: string, checked: boolean) => {
    if (checked) {
      setSelectedAddresses(prev => [...prev, address]);
    } else {
      setSelectedAddresses(prev => prev.filter(addr => addr !== address));
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    } catch (error) {
      console.error("Error copying address:", error);
      toast.error("Failed to copy address");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <MainContainer>
        <Toolbar title="Admin Panel" showBackButton={true} isWalletConnected={!!account} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying admin status...</p>
          </div>
        </div>
      </MainContainer>
    );
  }

  if (!account) {
    return (
      <MainContainer>
        <Toolbar title="Admin Panel" showBackButton={true} isWalletConnected={false} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Wallet Required</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access the admin panel.
            </p>
          </div>
        </div>
      </MainContainer>
    );
  }

  if (isAdmin === false) {
    return (
      <MainContainer>
        <Toolbar title="Admin Panel" showBackButton={true} isWalletConnected={!!account} />
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You do not have admin privileges to access this panel.
            </p>
          </div>
        </div>
      </MainContainer>
    );
  }

  const pendingApprovals = interestedAddresses.filter(addr => !whitelistedAddresses.includes(addr));

  return (
    <MainContainer>
      <Toolbar title="Admin Panel" showBackButton={true} isWalletConnected={!!account} />
      
      <div className="animate-fade-in p-5 lg:px-8">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl lg:text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground lg:text-lg">
            Manage whitelist approvals and admin roles for the Permalink platform.
          </p>
        </div>

        {/* Whitelist Toggle */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Platform Access Control</h3>
                <p className="text-muted-foreground text-sm">
                  {whitelistEnabled 
                    ? "Whitelist is currently enabled - only approved users can access the platform" 
                    : "Whitelist is currently disabled - platform is public and accessible to everyone"
                  }
                </p>
              </div>
              <Button
                onClick={handleToggleWhitelist}
                disabled={processing || whitelistEnabled === null}
                variant={whitelistEnabled ? "outline" : "default"}
                size="lg"
                className={whitelistEnabled ? "border-red-500 text-red-600 hover:bg-red-50" : ""}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : whitelistEnabled ? (
                  "Disable Whitelist (Make Public)"
                ) : (
                  "Enable Whitelist (Restrict Access)"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{pendingApprovals.length}</div>
              <div className="text-sm text-muted-foreground">Pending Approvals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{whitelistedAddresses.length}</div>
              <div className="text-sm text-muted-foreground">Whitelisted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{adminAddresses.length}</div>
              <div className="text-sm text-muted-foreground">Admins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{interestedAddresses.length}</div>
              <div className="text-sm text-muted-foreground">Total Interested</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="approvals">
              Pending Approvals ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="whitelist">
              Whitelist ({whitelistedAddresses.length})
            </TabsTrigger>
            <TabsTrigger value="admins">
              Admins ({adminAddresses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-6">
            <Card className="py-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Pending Whitelist Approvals
                  </span>
                  {selectedAddresses.length > 0 && (
                    <Button 
                      onClick={handleApproveAddresses}
                      disabled={processing}
                      size="sm"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Selected ({selectedAddresses.length})
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending approvals at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovals.map((address, index) => (
                      <div key={address} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAddresses.includes(address)}
                            onChange={(e) => handleSelectAddress(address, e.target.checked)}
                            className="w-4 h-4 rounded border border-input"
                          />
                          <div>
                            <div className="font-mono text-sm">{formatAddress(address)}</div>
                            <div className="text-xs text-muted-foreground">Interested Address #{index + 1}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={() => setSelectedAddresses(pendingApprovals)}
                        variant="outline"
                        size="sm"
                        className="mr-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        onClick={() => setSelectedAddresses([])}
                        variant="outline"
                        size="sm"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whitelist" className="mt-6">
            <Card className="py-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Whitelisted Addresses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {whitelistedAddresses.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No whitelisted addresses yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {whitelistedAddresses.map((address, index) => (
                      <div key={address} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-mono text-sm">{formatAddress(address)}</div>
                          <div className="text-xs text-muted-foreground">Whitelisted Address #{index + 1}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Badge variant="default" className="bg-green-600">Approved</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            <div className="space-y-6">
              {/* Add New Admin */}
              <Card className="py-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Admin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="admin-address">Ethereum Address</Label>
                      <Input
                        id="admin-address"
                        placeholder="0x..."
                        value={newAdminAddress}
                        onChange={(e) => setNewAdminAddress(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={handleAddAdmin}
                        disabled={processing || !newAdminAddress.trim()}
                        className="mt-2"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Admin
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Admins */}
              <Card className="py-6" >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Current Admins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {adminAddresses.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No admin addresses found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminAddresses.map((address, index) => (
                        <div key={address} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-mono text-sm">{formatAddress(address)}</div>
                            <div className="text-xs text-muted-foreground">
                              Admin #{index + 1} {address.toLowerCase() === account?.address.toLowerCase() && "(You)"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyAddress(address)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Badge variant="default" className="bg-blue-600">Admin</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainContainer>
  );
} 