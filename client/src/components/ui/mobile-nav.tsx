import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Bell, 
  MessageSquare, 
  User,
  Settings,
  Calendar,
  Phone,
  UserMinus,
  ClipboardList,
  Clock,
  Menu,
  X,
  Search
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [location] = useLocation();

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Clock className="h-5 w-5" />
    },
    {
      href: "/absent-teachers",
      label: "Absent Teachers",
      icon: <UserMinus className="h-5 w-5" />
    },
    {
      href: "/schedules",
      label: "Schedules",
      icon: <Calendar className="h-5 w-5" />
    },
    {
      href: "/lookup",
      label: "Lookup",
      icon: <Search className="h-5 w-5" />
    },
    {
      href: "/substitutes",
      label: "Substitutes",
      icon: <ClipboardList className="h-5 w-5" />
    },
    {
      href: "/notifications",
      label: "Notifications",
      icon: <Bell className="h-5 w-5" />
    },
    {
      href: "/messages",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      href: "/contacts",
      label: "Contacts",
      icon: <Phone className="h-5 w-5" />
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-5 w-5" />
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />
    }
  ];

  // Function to trigger haptic feedback
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration for feedback
    }
  };

  const handleNavigation = (href: string) => {
    triggerHaptic();
    setIsOpen(false);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="flex items-center justify-between h-full px-4 mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => handleNavigation('/dashboard')}
          asChild
        >
          <Link href="/dashboard">
            <Clock className="h-6 w-6" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => handleNavigation('/lookup')}
          asChild
        >
          <Link href="/lookup">
            <Search className="h-6 w-6" />
            <span className="sr-only">Lookup</span>
          </Link>
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-12 w-12"
              onClick={triggerHaptic}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="h-[80vh] rounded-t-xl pb-safe"
          >
            <div className="absolute right-4 top-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  triggerHaptic();
                  setIsOpen(false);
                }}
              >
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <nav className="grid grid-cols-3 gap-4 pt-4">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => handleNavigation(route.href)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-24 flex flex-col items-center justify-center gap-2 rounded-lg transition-colors",
                      location === route.href && "bg-secondary"
                    )}
                  >
                    {route.icon}
                    <span className="text-xs font-medium">{route.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => handleNavigation('/absent-teachers')}
          asChild
        >
          <Link href="/absent-teachers">
            <UserMinus className="h-6 w-6" />
            <span className="sr-only">Absent Teachers</span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => handleNavigation('/profile')}
          asChild
        >
          <Link href="/profile">
            <User className="h-6 w-6" />
            <span className="sr-only">Profile</span>
          </Link>
        </Button>
      </div>
    </nav>
  );
}