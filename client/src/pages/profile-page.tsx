import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, UserCheck } from "lucide-react";
import { Link } from "wouter";


export default function ProfilePage() {
  const { user } = useAuth();

  const navItems = [
    {
      title: "SMS History",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/sms-history",
      description: "View message history"
    },
    {
      title: "Substitute Teachers",
      icon: <UserCheck className="h-5 w-5" />,
      href: "/substitutes",
      description: "Manage substitute teachers"
    },
    {
      title: "Notifications",
      icon: <Bell className="h-5 w-5" />,
      href: "/notifications",
      description: "View system notifications"
    }
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">Welcome, {user?.username}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full hover:bg-accent/5 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-center gap-2">
                    {item.icon}
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}