import { Home, UserMinus, MessageSquare, MoreHorizontal, ClipboardList, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function BottomNav() {
  const [location] = useLocation();
  
  // Fetch notifications
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    }
  });
  
  const hasNotifications = notifications && notifications.length > 0;

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: UserMinus, label: "Attendee", href: "/attendees" },
    { icon: MessageSquare, label: "SMS", href: "/sms-send" },
    { icon: ClipboardList, label: "Class", href: "/manage-absences" },
    { 
      icon: hasNotifications ? Bell : MoreHorizontal, 
      label: hasNotifications ? "Alerts" : "More", 
      href: hasNotifications ? "/notifications" : "/more",
      badge: hasNotifications ? notifications.length : null
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t h-16">
      <div className="grid grid-cols-5 h-full max-w-md mx-auto">
        {items.map(({ icon: Icon, label, href, badge }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center relative ${
              location === href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {badge && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}