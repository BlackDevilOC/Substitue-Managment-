import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bell, 
  MessageSquare, 
  User,
  Settings,
  Calendar,
  Phone
} from "lucide-react";
import { Link } from "wouter";

export default function SecondaryNavPage() {
  const navItems = [
    {
      title: "Profile Settings",
      icon: <User className="h-5 w-5" />,
      href: "/profile",
      description: "Manage your account settings"
    },
    {
      title: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      href: "/schedule",
      description: "View and manage daily schedules"
    },
    {
      title: "SMS History",
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/sms-history",
      description: "View message history and notifications"
    },
    {
      title: "System Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
      description: "Configure system preferences"
    },
    {
      title: "Emergency Contacts",
      icon: <Phone className="h-5 w-5" />,
      href: "/emergency-contacts",
      description: "Manage emergency contact information"
    },
    {
      title: "Notifications",
      icon: <Bell className="h-5 w-5" />,
      href: "/notifications",
      description: "Manage notification preferences"
    }
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings & More</h1>
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
    </div>
  );
}