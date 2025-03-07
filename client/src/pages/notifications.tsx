import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ChevronRight, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  note?: string;
  sourcePage?: string;
  actionLink?: string;
  timestamp: string;
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    }
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <div className="space-y-4">
        {notifications?.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link href={notification.actionLink || "#"}>
              <Card className="hover:bg-accent/5 cursor-pointer transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.description}
                      </p>
                      {notification.note && (
                        <p className="text-sm text-muted-foreground italic">
                          Note: {notification.note}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}

        {!notifications?.length && !isLoading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No notifications at this time
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}