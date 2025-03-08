import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navigationItems = [
  { name: "SMS History", path: "/sms-history" },
  { name: "SMS Send", path: "/sms-send" },
  { name: "Periods", path: "/periods" },
  { name: "Settings", path: "/settings" },
  { name: "Assigned Substitutes", path: "/assigned-substitutes" },
  { name: "Notifications", path: "/notifications" },
  { name: "Teacher Lookup", path: "/lookup" }
];

export default function SecondaryNavPage() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">More Options</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navigationItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <Button 
              variant="outline" 
              className="w-full h-20 text-lg justify-start px-4"
              aria-current={location === item.path ? "page" : undefined}
            >
              {item.name}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}