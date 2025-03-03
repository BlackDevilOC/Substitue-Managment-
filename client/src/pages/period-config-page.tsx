import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, RefreshCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NetworkStatus } from "@/components/ui/network-status";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export default function PeriodConfigPage() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const { toast } = useToast();

  // Query to fetch period configuration
  const { data: serverPeriods, isLoading, refetch } = useQuery({
    queryKey: ['/api/period-config'],
    queryFn: async () => {
      const res = await fetch('/api/period-config');
      if (!res.ok) {
        throw new Error('Failed to fetch period configuration');
      }
      return res.json() as Promise<PeriodConfig[]>;
    },
    onSuccess: (data) => {
      setPeriods(data);
    },
    onError: () => {
      // If server fetch fails, try to load from localStorage
      const savedPeriods = localStorage.getItem('period_config');
      if (savedPeriods) {
        setPeriods(JSON.parse(savedPeriods));
      } else {
        // Initialize with a default period
        const defaultPeriod = [{ periodNumber: 1, startTime: "08:00", endTime: "09:00" }];
        setPeriods(defaultPeriod);
        localStorage.setItem('period_config', JSON.stringify(defaultPeriod));
      }
    }
  });

  // Mutation to save period configuration
  const saveMutation = useMutation({
    mutationFn: async (periodsToSave: PeriodConfig[]) => {
      const res = await fetch('/api/period-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(periodsToSave),
      });

      if (!res.ok) {
        throw new Error('Failed to save period configuration');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/period-config'] });
      toast({
        title: "Success",
        description: "Period configuration saved successfully",
      });
      // Update localStorage after successful save
      localStorage.setItem('period_config', JSON.stringify(periods));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const newPeriods = [
      ...periods,
      {
        periodNumber: lastPeriod.periodNumber + 1,
        startTime: lastPeriod.endTime,
        endTime: "00:00"
      }
    ];
    setPeriods(newPeriods);
  };

  const removePeriod = (index: number) => {
    const newPeriods = periods.filter((_, i) => i !== index).map((period, i) => ({
      ...period,
      periodNumber: i + 1
    }));
    setPeriods(newPeriods);
  };

  const updatePeriod = (index: number, field: keyof PeriodConfig, value: string) => {
    const updatedPeriods = periods.map((period, i) => {
      if (i === index) {
        return { ...period, [field]: value };
      }
      return period;
    });
    setPeriods(updatedPeriods);
  };

  const handleSave = () => {
    // Save to both server and localStorage
    saveMutation.mutate(periods);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <NetworkStatus />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Period Configuration</h1>
        <div className="space-x-2">
          <Button 
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button onClick={addPeriod}>
            <Plus className="h-4 w-4 mr-2" />
            Add Period
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

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {periods.map((period, index) => (
            <Card key={index}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Period {period.periodNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={period.startTime}
                      onChange={(e) => updatePeriod(index, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={period.endTime}
                      onChange={(e) => updatePeriod(index, "endTime", e.target.value)}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="mt-6"
                    onClick={() => removePeriod(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}