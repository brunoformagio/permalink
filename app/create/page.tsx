"use client";

import { useState } from "react";
import { ConnectButton, useActiveWallet } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image, FileText, DollarSign, Hash, Wallet, Archive, Play } from "lucide-react";
import { Toolbar } from "@/components/toolbar";
import { MainContainer } from "@/components/main-container";
import { toast } from "sonner";
import { createArtworkSeriesV5, getAccountFromWallet } from "@/lib/contractERC721";
import { validateImageFile, compressImage } from "@/lib/metadata";
import { WhitelistGuard } from "@/components/whitelist-guard";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";

export default function CreatePage() {
  const router = useRouter();
  const activeWallet = useActiveWallet();
  const currentUserAddress = activeWallet?.getAccount()?.address;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    editions: "1"
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [isZipFile, setIsZipFile] = useState(false);
  const [minting, setMinting] = useState(false);
  
  // Generative art preview states
  const [generativePreview, setGenerativePreview] = useState<string | null>(null);
  const [loadingGenerative, setLoadingGenerative] = useState(false);
  const [showGenerativePreview, setShowGenerativePreview] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a zip file
    const isZip = file.name.toLowerCase().endsWith('.zip');
    setIsZipFile(isZip);

    if (isZip) {
      // Handle zip file (generative art)
      if (file.size > 16 * 1024) {
        toast.error("Zip file must be less than 16KB for on-chain storage");
        return;
      }
      
      setUploadedFile(file);
      setImagePreview(null);
      
      // Process ZIP file for generative art preview
      processGenerativeArt(file);
      
      toast.success(
        `Generative art package uploaded! (${(file.size / 1024).toFixed(1)} KB)`
      );
      return;
    }

    // Handle image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setImageProcessing(true);
      toast.loading("Processing image for on-chain storage...", { id: "image-processing" });

      // Compress image if needed for on-chain storage
      let processedFile = file;
      if (file.size > 16 * 1024) { // If larger than 16KB, compress
        toast.loading("Compressing image for optimal on-chain storage...", { id: "image-processing" });
        processedFile = await compressImage(file, 16); // 16KB max
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(processedFile);
      
      // Update state
      setUploadedFile(processedFile);
      setImagePreview(previewUrl);
      
      toast.success(
        `Image processed successfully! (${(processedFile.size / 1024).toFixed(1)} KB)`,
        { id: "image-processing" }
      );

    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image. Please try again.", { id: "image-processing" });
      setUploadedFile(null);
      setImagePreview(null);
    } finally {
      setImageProcessing(false);
    }
  };

  // Get valid image type for contract
  const getValidImageType = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // First try file extension (most reliable)
    if (fileName.endsWith('.jpeg') || fileName.endsWith('.jpg')) return 'jpeg';
    if (fileName.endsWith('.png')) return 'png';
    if (fileName.endsWith('.gif')) return 'gif';
    if (fileName.endsWith('.webp')) return 'webp';
    if (fileName.endsWith('.svg')) return 'svg';
    
    // Fallback to MIME type mapping
    const mimeToType: { [key: string]: string } = {
      'image/jpeg': 'jpeg',
      'image/jpg': 'jpeg', // Some browsers use this
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    };
    
    if (mimeToType[mimeType]) {
      return mimeToType[mimeType];
    }
    
    // Last resort: extract from MIME type
    const typePart = mimeType.split('/')[1];
    if (typePart === 'jpeg' || typePart === 'jpg') return 'jpeg';
    if (['png', 'gif', 'webp', 'svg'].includes(typePart)) return typePart;
    
    // Default fallback
    console.warn('Unknown file type:', fileName, mimeType);
    return 'jpeg'; // Safe fallback
  };

  // Process generative art ZIP file for preview
  const processGenerativeArt = async (file: File) => {
    try {
      setLoadingGenerative(true);
      toast.loading("Processing generative art...", { id: "generative-processing" });

      // Load JSZip dynamically
      const JSZip = (await import('jszip')).default;
      
      // Read the ZIP file
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Look for index.html
      const indexFile = zip.file('index.html');
      if (!indexFile) {
        toast.error("No index.html found in the ZIP package", { id: "generative-processing" });
        return;
      }
      
      // Get the HTML content
      let htmlContent = await indexFile.async('text');
      
      // Process other files and create blob URLs
      const fileUrls: { [key: string]: string } = {};
      
      for (const [path, zipObject] of Object.entries(zip.files)) {
        if (!zipObject.dir && path !== 'index.html') {
          const blob = await zipObject.async('blob');
          fileUrls[path] = URL.createObjectURL(blob);
        }
      }
      
      // Replace relative file references with blob URLs
      Object.keys(fileUrls).forEach(path => {
        const regex = new RegExp(`(?:src="|href=")${path}(?=")`, 'g');
        htmlContent = htmlContent.replace(regex, `src="${fileUrls[path]}"`);
      });
      
      // Inject preview mode script (testing mode, not NFT mode)
      const previewInjection = `
        <script>
          // Preview mode - enable regeneration
          const isPreviewMode = true;
          
          // Generate random hash for preview
          const previewHash = '0x' + Array.from({length: 64}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('');
          
          // Override URL parameters for preview
          const originalURLSearchParams = window.URLSearchParams;
          window.URLSearchParams = function(search) {
            const params = new originalURLSearchParams(search);
            params.set('hash', previewHash);
            return params;
          };
          
          // Auto-generate when loaded
          window.addEventListener('load', function() {
            window.postMessage({
              type: 'SET_HASH',
              hash: previewHash
            }, '*');
          });
        </script>
      `;
      
      // Insert the script before closing head tag
      htmlContent = htmlContent.replace('</head>', previewInjection + '</head>');
      
      setGenerativePreview(htmlContent);
      setShowGenerativePreview(true);
      
      toast.success("Generative art preview ready!", { id: "generative-processing" });
      
    } catch (error) {
      console.error('Error processing generative art:', error);
      toast.error("Failed to process generative art. Please check your ZIP file format.", { id: "generative-processing" });
    } finally {
      setLoadingGenerative(false);
    }
  };

  const handleGenerativePreview = () => {
    if (generativePreview) {
      setShowGenerativePreview(true);
    } else if (uploadedFile && isZipFile) {
      processGenerativeArt(uploadedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeWallet || !currentUserAddress) {
      toast.error("Please connect your wallet to mint artwork");
      return;
    }

    if (!uploadedFile) {
      toast.error("Please upload an artwork file");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your artwork");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!formData.editions || parseInt(formData.editions) <= 0) {
      toast.error("Please enter a valid number of editions");
      return;
    }

    try {
      setMinting(true);
      
      // Get account from thirdweb wallet
      const account = getAccountFromWallet(activeWallet);
      if (!account) {
        toast.error("Unable to get wallet account");
        return;
      }
      
      // Show processing progress
      toast.loading("Converting image to bytes for on-chain storage...", { id: "minting-progress" });
      
      // Convert file to bytes array
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const imageBytes = new Uint8Array(arrayBuffer);
      
      // Get file extension with robust type detection
      let imageType: string;
      if (uploadedFile.name.toLowerCase().endsWith('.zip')) {
        imageType = 'zip';
      } else {
        imageType = getValidImageType(uploadedFile);
      }
      
      console.log("Image size:", imageBytes.length, "bytes");
      console.log("Image type:", imageType);
      
      // Show series creation progress
      toast.loading("Creating artwork series with on-chain storage...", { id: "minting-progress" });
      
      // Call the contract function with raw image data
      const result = await createArtworkSeriesV5(
        account,
        formData.title,
        formData.description,
        imageBytes,      // Raw image bytes
        imageType,       // File extension
        formData.price,
        parseInt(formData.editions)
      );

      if (result.success) {
        toast.success("Artwork series created successfully with on-chain storage!", { id: "minting-progress" });
        
        // Show transaction hash
        if (result.txHash) {
          console.log("Minting transaction hash:", result.txHash);
          
          toast.success(
            `Series created! Hash: ${result.txHash.slice(0, 10)}...`,
            {
              action: {
                label: "View on Explorer",
                onClick: () => window.open(
                  `https://testnet.explorer.etherlink.com/tx/${result.txHash}`,
                  '_blank'
                )
              },
              duration: 15000,
            }
          );
        }
        
        // Show redirect notification
        toast.loading("Redirecting to showcase your new artwork series...", {
          id: "minting-redirect"
        });
        
        // Redirect to main page where user can see their new artwork series
        setTimeout(() => {
          toast.success("Welcome to your updated gallery!", {
            id: "minting-redirect"
          });
          router.push('/main?refresh=true'); // Add refresh flag
        }, 3000);
        
      } else {
        toast.error(result.error || "Failed to create artwork series", { id: "minting-progress" });
      }
      
    } catch (error) {
      console.error("Series creation error:", error);
      toast.error("Failed to create artwork series. Please try again.", { id: "minting-progress" });
    } finally {
      setMinting(false);
    }
  };

  const isFormValid = formData.title.trim() && 
                     formData.price && 
                     parseFloat(formData.price) > 0 &&
                     formData.editions && 
                     parseInt(formData.editions) > 0 &&
                     uploadedFile &&
                     !imageProcessing &&
                     currentUserAddress;

  return (
    <WhitelistGuard>
      <MainContainer>
              <Toolbar 
        title="Create Artwork Series" 
        showBackButton={true} 
        isWalletConnected={!!currentUserAddress} 
      />

      <div className="animate-fade-in p-5 lg:px-8">
        {/* Header */}
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
          <h1 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">Create Series on Etherlink</h1>
          <p className="text-muted-foreground lg:text-lg">
            Upload your artwork and create a series template for unique NFT minting.
          </p>
        </div>

        {/* Wallet Connection Warning */}
        {!currentUserAddress && (
          <Card className="mb-6 border-orange-500/20 bg-orange-500/10">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-semibold text-orange-600">Wallet Required</div>
                  <div className="text-sm text-orange-600/80">
                    Connect your wallet to create artwork series on the blockchain.
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
            />  
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              {/* File Upload */}
              <Card>
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-center mb-4">
                    <Image className="mr-2 h-5 w-5" aria-hidden="true" />
                    <Label htmlFor="file-upload" className="text-lg font-semibold">Upload Artwork</Label>
                  </div>
                  <Card className="border-2 border-dashed border-border hover:border-ring transition-colors">
                    <CardContent className="p-8 lg:p-12">
                      <label htmlFor="file-upload" className="cursor-pointer block text-center">
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept="image/*,.zip"
                          onChange={handleFileUpload}
                          disabled={minting}
                        />
                        {imageProcessing ? (
                          <div className="space-y-3">
                            <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-b-2 border-primary mx-auto" />
                            <div className="font-medium lg:text-lg">Processing image...</div>
                            <div className="text-muted-foreground text-sm lg:text-base">
                              Optimizing for on-chain storage
                            </div>
                          </div>
                        ) : uploadedFile ? (
                          <div className="space-y-3">
                            {isZipFile ? (
                              <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto rounded-lg border bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                <Archive className="h-12 w-12 lg:h-16 lg:w-16 text-purple-600" />
                              </div>
                            ) : imagePreview ? (
                              <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto rounded-lg overflow-hidden border">
                                                              <img 
                                src={imagePreview} 
                                alt="Uploaded artwork preview"
                                className="w-full h-full object-cover"
                              />
                              </div>
                            ) : null}
                            <div className="font-medium lg:text-lg">{uploadedFile.name}</div>
                            <div className="text-green-500 text-sm lg:text-base">
                              {isZipFile ? "Generative art ready" : "Ready for on-chain storage"} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {isZipFile 
                                ? "Interactive artwork will be stored permanently on the blockchain"
                                : "Image will be stored permanently on the blockchain"
                              }
                            </div>

                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload className="h-12 w-12 lg:h-16 lg:w-16 text-muted-foreground mx-auto" />
                            <div className="font-medium lg:text-lg">Click to upload your artwork</div>
                            <div className="text-muted-foreground text-sm lg:text-base">
                              Images or .zip files up to 16 KB for permanent on-chain storage
                            </div>
                          </div>
                        )}
                      </label>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Artwork Details */}
              <Card>
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-center mb-6">
                    <FileText className="mr-2 h-5 w-5" />
                    <h2 className="text-lg font-semibold">Artwork Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Enter artwork title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        disabled={minting}
                        className="mt-2"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Describe your artwork, its inspiration, and unique features..."
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={minting}
                        className="min-h-32 mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="price" className="flex items-center">
                        <DollarSign className="mr-1 h-4 w-4" />
                        Price per edition (XTZ) *
                      </Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="0.1"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        disabled={minting}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="editions" className="flex items-center">
                        <Hash className="mr-1 h-4 w-4" />
                        Maximum editions *
                      </Label>
                      <Input
                        id="editions"
                        name="editions"
                        type="number"
                        step="1"
                        min="1"
                        max="10000"
                        placeholder="1"
                        value={formData.editions}
                        onChange={handleInputChange}
                        required
                        disabled={minting}
                        className="mt-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Number of copies that can be minted
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full lg:w-auto lg:px-12" 
                size="lg"
                disabled={!isFormValid || minting}
              >
                {minting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Minting...
                  </>
                ) : (
                  "Mint Artwork"
                )}
              </Button>
              
              {!currentUserAddress && (
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to enable minting
                </p>
              )}
            </form>
          </div>

          {/* Preview/Info Panel - Desktop only */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Preview */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Preview</h3>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                    {imageProcessing ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                        <div className="text-sm font-medium">Processing...</div>
                      </div>
                    ) : uploadedFile && isZipFile ? (
                      <div className="text-center flex flex-col items-center justify-center h-full relative cursor-pointer group"
                           onClick={handleGenerativePreview}>
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-3 relative">
                          <Archive className="h-10 w-10 text-purple-600" />
                          {loadingGenerative && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-purple-600">Generative Art</div>
                        <div className="text-xs text-muted-foreground mb-3">Interactive artwork package</div>
                        
                        {/* Preview overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <div className="text-white text-center">
                            <Play className="h-8 w-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">Click to Preview</div>
                          </div>
                        </div>
                      </div>
                    ) : imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Artwork preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image className="h-12 w-12 mx-auto mb-2" aria-label="Upload artwork preview placeholder" />
                        <div className="text-sm">Upload artwork to preview</div>
                        <div className="text-xs mt-1">Images or .zip files</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Preview Button for Generative Art */}
                  {uploadedFile && isZipFile && (
                    <Button 
                      type="button"
                      onClick={handleGenerativePreview}
                      disabled={loadingGenerative}
                      className="w-full mb-4 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {loadingGenerative ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Preview Interactive Art
                        </>
                      )}
                    </Button>
                  )}
                  
                  {formData.title && (
                    <div>
                      <div className="font-semibold">{formData.title}</div>
                      <div className="text-sm text-muted-foreground">
                        by {currentUserAddress ? `${currentUserAddress.slice(0, 6)}...${currentUserAddress.slice(-4)}` : "You"}
                      </div>
                      {formData.price && (
                        <div className="text-lg font-bold mt-2">{formData.price} XTZ</div>
                      )}
                      {formData.editions && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Series supply: {formData.editions} unique NFT{parseInt(formData.editions) > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Storage Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">On-Chain Storage</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage Type</span>
                      <span className="text-green-600 font-medium">On-Chain</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size</span>
                      <span>{uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permanence</span>
                      <span className="text-green-600 font-medium">Forever</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metadata</span>
                      <span className="text-blue-600 font-medium">Dynamic</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground">
                      <strong>Optimized:</strong> Images stored as raw bytes on-chain (max 16KB) with dynamic metadata generation.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Minting Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Minting Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockchain</span>
                      <span>Etherlink Testnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token Standard</span>
                      <span>ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span>~0.001 XTZ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>2.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Artist Royalty</span>
                      <span>10%</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Size Limit</span>
                      <span className="text-blue-600">16KB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Tips for Success</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Use optimized images or .zip files (up to 16KB for on-chain storage)</li>
                    <li>• .zip files enable generative/interactive art</li>
                    <li>• Smaller files = lower gas costs</li>
                    <li>• Write detailed, engaging descriptions</li>
                    <li>• Research comparable artwork prices</li>
                    <li>• Consider limited editions for scarcity</li>
                    <li>• Files stored permanently with dynamic metadata</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Contract Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Smart Contract</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract</span>
                      <span className="font-mono text-xs">
                        {process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET 
                          ? `${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET.slice(0, 6)}...${process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET.slice(-4)}`
                          : "Not configured"
                        }
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Images stored as raw bytes with metadata generated dynamically for optimal gas efficiency.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Ready Note */}
        <Card className="mt-6 lg:hidden">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm text-center">
              <strong>Ready to Create Series:</strong> Your artwork template will be stored permanently on-chain (max 16KB).
            </p>
          </CardContent>
        </Card>
              </div>

        {/* Generative Art Preview Modal */}
        {showGenerativePreview && generativePreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <Archive className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Generative Art Preview</h2>
                    <p className="text-sm text-muted-foreground">
                      This is how your artwork will appear to collectors
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowGenerativePreview(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="relative h-[70vh]">
                <iframe
                  srcDoc={generativePreview}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Generative art preview"
                />
              </div>
              
              <div className="p-4 border-t bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    💡 Each buyer will receive a unique NFT with artwork generated from their specific token ID
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowGenerativePreview(false)}
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainContainer>
    </WhitelistGuard>
  );
} 