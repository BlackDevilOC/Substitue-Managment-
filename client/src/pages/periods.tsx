import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Save, RefreshCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { NetworkStatus } from "@/components/ui/network-status";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface PeriodTime {
  start: string;
  end: string;
}

const DEFAULT_PERIODS: PeriodTime[] = [
  { start: "08:00", end: "08:45" },
  { start: "08:45", end: "09:30" },
  { start: "09:45", end: "10:30" },
  { start: "10:30", end: "11:15" },
  { start: "11:30", end: "12:15" },
  { start: "12:15", end: "13:00" },
  { start: "13:00", end: "13:45" },
  { start: "13:45", end: "14:30" },
];

export default function PeriodsPage() {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<PeriodTime[]>(DEFAULT_PERIODS);

  // Query to fetch period times
  const { isLoading, refetch } = useQuery({
    queryKey: ['/api/periods'],
    queryFn: async () => {
      const res = await fetch('/api/periods');
      if (!res.ok) {
        throw new Error('Failed to fetch period times');
      }
      return res.json() as Promise<PeriodTime[]>;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setPeriods(data);
      }
    }
  });

  // Mutation to save period times
  const saveMutation = useMutation({
    mutationFn: async (periodsToSave: PeriodTime[]) => {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(periodsToSave),
      });

      if (!res.ok) {
        throw new Error('Failed to save period times');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/periods'] });
      toast({
        title: "Success",
        description: "Period times saved successfully",
      });
      // Update localStorage after successful save
      localStorage.setItem('period_times', JSON.stringify(periods));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const currentDay = format(new Date(), 'EEEE').toLowerCase();
  const currentTime = new Date();
  const currentTimeStr = format(currentTime, 'HH:mm');

  const getCurrentPeriod = () => {
    for (let i = 0; i < periods.length; i++) {
      if (currentTimeStr >= periods[i].start && currentTimeStr <= periods[i].end) {
        return i + 1;
      }
    }
    return null;
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const handleSave = () => {
    saveMutation.mutate(periods);
  };

  const handleRefresh = () => {
    refetch();
  };

  const currentPeriod = getCurrentPeriod();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <NetworkStatus />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Period Times</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">
            {currentPeriod 
              ? `Period ${currentPeriod} is in progress`
              : "No period is currently active"
            }
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Current time: {format(currentTime, "HH:mm")}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {periods.map((period, index) => (
            <Card key={index} className={currentPeriod === index + 1 ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Period {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">Start Time</label>
                    <Input
                      type="time"
                      value={period.start}
                      onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">End Time</label>
                    <Input
                      type="time"
                      value={period.end}
                      onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}