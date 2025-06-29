"use client";

import { Suspense } from "react";
import { MainContainer } from "@/components/main-container";
import { MainPageContent } from "@/components/main-page-content";

export default function MainPage() {
  return (
    <Suspense fallback={
      <MainContainer>
        <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MainContainer>
    }>
      <MainPageContent />
    </Suspense>
  );
}