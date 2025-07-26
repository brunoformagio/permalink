"use client";

import { useEffect, useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import Image from "next/image";
import { getArtworkImageData } from "@/lib/contractERC721";

interface GenerativeThumbnailProps {
  tokenId?: number;
  seriesId?: number;
  className?: string;
  size?: number;
}

export function GenerativeThumbnail({ 
  tokenId, 
  seriesId, 
  className = "w-full h-full", 
  size = 400 
}: GenerativeThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tokenId && !seriesId) {
      setError(true);
      setLoading(false);
      return;
    }

    generateThumbnail();
  }, [tokenId, seriesId]);

  const generateThumbnail = async () => {
    try {
      setLoading(true);
      
      // Get image data (use tokenId if available, otherwise try seriesId)
      const targetId = tokenId || seriesId;
      if (!targetId) return;
      
      const imageData = await getArtworkImageData(targetId);
      if (!imageData || imageData.imageType !== 'zip') {
        setError(true);
        return;
      }

      // Convert hex to bytes
      const hexString = imageData.imageData.startsWith('0x') 
        ? imageData.imageData.slice(2) 
        : imageData.imageData;
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      
      // Load JSZip
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(bytes);
      
      // Get HTML content
      const indexFile = zip.file('index.html');
      if (!indexFile) {
        setError(true);
        return;
      }
      
      let htmlContent = await indexFile.async('text');
      
      // Process other files and create blob URLs
      const fileUrls: { [key: string]: string } = {};
      for (const [path, zipObject] of Object.entries(zip.files)) {
        if (!zipObject.dir && path !== 'index.html') {
          const blob = await zipObject.async('blob');
          fileUrls[path] = URL.createObjectURL(blob);
        }
      }
      
      // Replace file references
      Object.keys(fileUrls).forEach(path => {
        const regex = new RegExp(`(?:src="|href=")${path}(?=")`, 'g');
        htmlContent = htmlContent.replace(regex, `src="${fileUrls[path]}"`);
      });
      
      // Generate deterministic hash for thumbnail
      const thumbnailHash = tokenId 
        ? `0x${tokenId.toString(16).padStart(64, '0')}`
        : `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      // Inject hash for deterministic generation
      const hashInjection = 
        '<script>' +
        'window.PERMALINK_TOKEN_HASH = "' + thumbnailHash + '";\n' +
        'window.PERMALINK_IS_NFT_MODE = true;\n' +
        'const OriginalURLSearchParams = window.URLSearchParams;\n' +
        'window.URLSearchParams = function(search) {\n' +
        '  return new OriginalURLSearchParams("hash=' + thumbnailHash + '");\n' +
        '};\n' +
        '</script>';
      
      htmlContent = htmlContent.replace('<head>', '<head>' + hashInjection);
      
      // Render in hidden iframe and capture thumbnail
      await renderThumbnail(htmlContent);
      
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderThumbnail = async (htmlContent: string): Promise<void> => {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = `${size}px`;
      iframe.style.height = `${size}px`;
      iframe.sandbox.add('allow-scripts', 'allow-same-origin');
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
              resolve();
              return;
            }
            
            const canvas = iframeDoc.querySelector('canvas') as HTMLCanvasElement;
            if (canvas) {
              const dataURL = canvas.toDataURL('image/png', 0.8);
              setThumbnail(dataURL);
            }
          } catch (error) {
            console.error('Error capturing canvas:', error);
          } finally {
            document.body.removeChild(iframe);
            resolve();
          }
        }, 4000); // Wait for art to fully render
      };
      
      iframe.srcdoc = htmlContent;
    });
  };

  if (loading) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
          <div className="text-xs text-muted-foreground">Generating...</div>
        </div>
      </div>
    );
  }

  if (error || !thumbnail) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-2">
            <Archive className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-xs text-purple-600 font-medium">Generative Art</div>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={thumbnail}
      alt="Generative Art Thumbnail"
      fill
      className="object-cover"
      unoptimized
    />
  );
} 