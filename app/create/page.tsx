"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, CheckCircle, Image, FileText, DollarSign, Hash } from "lucide-react";
import { Toolbar } from "@/components/toolbar";
import { MainContainer } from "@/components/main-container";

export default function CreatePage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    editions: "1"
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("This is a demo. Minting functionality is not available.");
  };

  return (
    <MainContainer>
      <Toolbar title="Mint Artwork" showBackButton={true} isWalletConnected={true} />

      <div className="animate-fade-in p-5 lg:px-8">
        {/* Header */}
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
          <h1 className="text-2xl lg:text-4xl font-bold mb-2 lg:mb-4">Mint on Etherlink Mainnet</h1>
          <p className="text-muted-foreground lg:text-lg">
            Upload your artwork and mint it on Etherlink blockchain.
          </p>
        </div>

        {/* Desktop Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              {/* File Upload */}
              <Card>
                <CardContent className="p-6 lg:p-8">
                  <div className="flex items-center mb-4">
                    <Image className="mr-2 h-5 w-5" />
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
                        />
                        {uploadedFile ? (
                          <div className="space-y-3">
                            <CheckCircle className="h-12 w-12 lg:h-16 lg:w-16 text-green-500 mx-auto" />
                            <div className="font-medium lg:text-lg">{uploadedFile.name}</div>
                            <div className="text-green-500 text-sm lg:text-base">File uploaded successfully</div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Upload className="h-12 w-12 lg:h-16 lg:w-16 text-muted-foreground mx-auto" />
                            <div className="font-medium lg:text-lg">Click to upload your artwork</div>
                            <div className="text-muted-foreground text-sm lg:text-base">.zip up to 24 MB or image files</div>
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
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Enter artwork title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
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
                        className="min-h-32 mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="price" className="flex items-center">
                        <DollarSign className="mr-1 h-4 w-4" />
                        Price (XTZ)
                      </Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.1"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="editions" className="flex items-center">
                        <Hash className="mr-1 h-4 w-4" />
                        Editions
                      </Label>
                      <Input
                        id="editions"
                        name="editions"
                        type="number"
                        step="1"
                        min="1"
                        placeholder="1"
                        value={formData.editions}
                        onChange={handleInputChange}
                        required
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button type="submit" className="w-full lg:w-auto lg:px-12" size="lg">
                Mint Artwork
              </Button>
            </form>
          </div>

          {/* Preview/Info Panel - Desktop only */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Preview */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Preview</h3>
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-4">
                    {uploadedFile ? (
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <div className="text-sm font-medium">Ready to mint</div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image className="h-12 w-12 mx-auto mb-2" />
                        <div className="text-sm">Upload an image to preview</div>
                      </div>
                    )}
                  </div>
                  {formData.title && (
                    <div>
                      <div className="font-semibold">{formData.title}</div>
                      <div className="text-sm text-muted-foreground">by You</div>
                      {formData.price && (
                        <div className="text-lg font-bold mt-2">{formData.price} XTZ</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Minting Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Minting Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockchain</span>
                      <span>Etherlink</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span>~0.001 XTZ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>2.5%</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-semibold">
                      <span>Total Cost</span>
                      <span>~0.001 XTZ</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Tips for Success</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Use high-quality images (min 1000x1000px)</li>
                    <li>• Write detailed descriptions</li>
                    <li>• Research comparable artwork prices</li>
                    <li>• Consider limited editions for scarcity</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Note about demo - Mobile version */}
        <Card className="mt-6 lg:hidden">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm text-center">
              <strong>Note:</strong> This is a demo interface. Actual minting functionality requires wallet connection and gas fees.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainContainer>
  );
} 