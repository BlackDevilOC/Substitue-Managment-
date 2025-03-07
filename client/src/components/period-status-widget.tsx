
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export function PeriodStatusWidget() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load period config from server
  const loadPeriodConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/period-config');
      if (response.ok) {
        const serverPeriods = await response.json();
        setPeriods(serverPeriods);
      }
    } catch (error) {
      console.warn('Could not fetch from server, falling back to localStorage');
      // Fall back to localStorage if server is unavailable
      const savedPeriods = localStorage.getItem('period_config');
      if (savedPeriods) {
        setPeriods(JSON.parse(savedPeriods));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update current time and detect current period
  useEffect(() => {
    // Initial time set
    setCurrentTime(new Date());
    
    // Update time every minute
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Initial data load
  useEffect(() => {
    loadPeriodConfig();
  }, []);

  // Determine current period when time changes
  useEffect(() => {
    const getCurrentPeriod = () => {
      if (!periods || !periods.length) return null;
      
      const currentTimeStr = format(currentTime, 'HH:mm');
      
      for (let i = 0; i < periods.length; i++) {
        if (currentTimeStr >= periods[i].startTime && currentTimeStr <= periods[i].endTime) {
          return periods[i].periodNumber;
        }
      }
      return null;
    };

    setCurrentPeriod(getCurrentPeriod());
  }, [currentTime, periods]);

  // Handle refresh click
  const handleRefresh = () => {
    setCurrentTime(new Date());
    loadPeriodConfig();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <Clock className="h-8 w-8 text-primary" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
          className="p-1 h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div>
        {currentPeriod ? (
          <>
            <div className="text-2xl font-bold">Period {currentPeriod}</div>
            <p className="text-sm text-muted-foreground">in progress</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">No Period</div>
            <p className="text-sm text-muted-foreground">currently active</p>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {format(currentTime, "HH:mm")} • {periods.length} periods configured
      </p>
    </div>
  );
}
