
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export function PeriodStatusWidget() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);

  useEffect(() => {
    // Update current time every minute
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadPeriodConfig = async () => {
      try {
        // Try to load from the server first
        const response = await fetch('/api/period-config');
        if (response.ok) {
          const serverPeriods = await response.json();
          setPeriods(serverPeriods);
          return;
        }
      } catch (error) {
        console.warn('Could not fetch from server, falling back to localStorage');
      }

      // Fall back to localStorage if server is unavailable
      const savedPeriods = localStorage.getItem('period_config');
      if (savedPeriods) {
        setPeriods(JSON.parse(savedPeriods));
      }
    };

    loadPeriodConfig();
  }, []);

  useEffect(() => {
    // Get current period based on time
    const getCurrentPeriod = () => {
      if (!periods.length) return null;
      
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

  return (
    <div className="flex flex-col gap-2">
      <Clock className="h-8 w-8 text-primary" />
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
