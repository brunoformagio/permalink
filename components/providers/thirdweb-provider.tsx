"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { client } from "@/lib/thirdweb";

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