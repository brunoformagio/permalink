"use client";

import { ThirdwebProvider } from "thirdweb/react";

interface ThirdwebProviderWrapperProps {
  children: React.ReactNode;
}

export function ThirdwebProviderWrapper({ children }: ThirdwebProviderWrapperProps) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
} 