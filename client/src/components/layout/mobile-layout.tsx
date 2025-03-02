
import React from "react";
import { MobileNav } from "@/components/ui/mobile-nav";
import { NetworkStatus } from "@/components/ui/network-status";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <MobileNav />
      <NetworkStatus />
    </div>
  );
}
