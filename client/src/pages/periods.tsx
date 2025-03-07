import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export default function PeriodConfigPage() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const { toast } = useToast();
  const currentTime = new Date();
  const currentTimeStr = format(currentTime, 'HH:mm');

  useEffect(() => {
    const loadPeriodConfig = async () => {
      try {
        // Try to load from the server first
        const response = await fetch('/api/period-config');
        if (response.ok) {
          const serverPeriods = await response.json();
          setPeriods(serverPeriods);
          // Update local storage with server data
          localStorage.setItem('period_config', JSON.stringify(serverPeriods));
          return;
        }
      } catch (error) {
        console.warn('Could not fetch from server, falling back to localStorage');
      }

      // Fall back to localStorage if server is unavailable
      const savedPeriods = localStorage.getItem('period_config');
      if (savedPeriods) {
        setPeriods(JSON.parse(savedPeriods));
      } else {
        // Initialize with 8 default periods
        const defaultPeriods = [
          { periodNumber: 1, startTime: "08:00", endTime: "08:45" },
          { periodNumber: 2, startTime: "08:45", endTime: "09:30" },
          { periodNumber: 3, startTime: "09:45", endTime: "10:30" },
          { periodNumber: 4, startTime: "10:30", endTime: "11:15" },
          { periodNumber: 5, startTime: "11:30", endTime: "12:15" },
          { periodNumber: 6, startTime: "12:15", endTime: "13:00" },
          { periodNumber: 7, startTime: "13:00", endTime: "13:45" },
          { periodNumber: 8, startTime: "13:45", endTime: "14:30" }
        ];
        setPeriods(defaultPeriods);
        localStorage.setItem('period_config', JSON.stringify(defaultPeriods));
      }
    };

    loadPeriodConfig();
  }, []);

  const getCurrentPeriod = () => {
    for (let i = 0; i < periods.length; i++) {
      if (currentTimeStr >= periods[i].startTime && currentTimeStr <= periods[i].endTime) {
        return i + 1;
      }
    }
    return null;
  };

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
    localStorage.setItem('period_config', JSON.stringify(newPeriods));
  };

  const removePeriod = (index: number) => {
    const newPeriods = periods.filter((_, i) => i !== index).map((period, i) => ({
      ...period,
      periodNumber: i + 1
    }));
    setPeriods(newPeriods);
    localStorage.setItem('period_config', JSON.stringify(newPeriods));
  };

  const updatePeriod = (index: number, field: keyof PeriodConfig, value: string) => {
    const updatedPeriods = periods.map((period, i) => {
      if (i === index) {
        return { ...period, [field]: value };
      }
      return period;
    });
    setPeriods(updatedPeriods);
    localStorage.setItem('period_config', JSON.stringify(updatedPeriods));
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('period_config', JSON.stringify(periods));

      // Save to server (which also saves to data folder)
      const response = await fetch('/api/period-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(periods),
      });

      if (!response.ok) {
        throw new Error('Failed to save to server');
      }

      toast({
        title: "Success",
        description: "Period configuration saved successfully",
      });
    } catch (error) {
      console.error('Error saving period configuration:', error);
      toast({
        title: "Partially saved",
        description: "Saved locally but failed to sync with server",
        variant: "default",
      });
    }
  };

  const currentPeriod = getCurrentPeriod();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Period Configuration</h1>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")}
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

      <div className="flex justify-end space-x-2">
        <Button onClick={addPeriod}>
          <Plus className="h-4 w-4 mr-2" />
          Add Period
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4">
        {periods.map((period, index) => (
          <Card key={index} className={currentPeriod === period.periodNumber ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Period {period.periodNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => updatePeriod(index, "startTime", e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">End Time</label>
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
    </div>
  );
}