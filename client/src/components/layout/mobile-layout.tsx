import React from "react";
import { MobileNav } from "@/components/ui/mobile-nav";
import { NetworkStatus } from "@/components/ui/network-status";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col">
        <main className="flex-1 pb-16 pt-4 px-4 md:px-6">
          {/* Enable hardware acceleration for smoother scrolling */}
          <div className="transform-gpu">
            {children}
          </div>
        </main>
      </div>
      {isMobile && (
        <>
          <MobileNav />
          <NetworkStatus />
        </>
      )}
    </div>
  );
}