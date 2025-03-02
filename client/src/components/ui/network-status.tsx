
import React from "react";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 px-4 z-50 transition-all duration-300 ease-in-out">
      <Alert variant={isOnline ? "default" : "destructive"} className="animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <AlertTitle>{isOnline ? "Connected" : "Offline"}</AlertTitle>
        </div>
        <AlertDescription>
          {isOnline 
            ? "You are now connected to the internet." 
            : "You are offline. Some features may not work."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
