import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export default function PeriodConfigPage() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadPeriodConfig = async () => {
      try {
        // Try to load from the server
        const response = await fetch('/api/period-config');
        if (response.ok) {
          const serverPeriods = await response.json();
          setPeriods(serverPeriods);
          // Update local storage with server data
          localStorage.setItem('period_config', JSON.stringify(serverPeriods));
          return;
        }
      } catch (error) {
        console.warn('Could not fetch from server, falling back to localStorage', error);
      }

      // Fall back to localStorage if server is unavailable
      const savedPeriods = localStorage.getItem('period_config');
      if (savedPeriods) {
        setPeriods(JSON.parse(savedPeriods));
      } else {
        // Initialize with a default period
        const defaultPeriod = [{ periodNumber: 1, startTime: "08:00", endTime: "09:00" }];
        setPeriods(defaultPeriod);
        localStorage.setItem('period_config', JSON.stringify(defaultPeriod));
      }
    };

    loadPeriodConfig();
  }, []);
  
  const updatePeriod = (index: number, field: keyof PeriodConfig, value: string | number) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
    savePeriods(newPeriods);
  };

  const addPeriod = () => {
    const newPeriod: PeriodConfig = {
      periodNumber: periods.length + 1,
      startTime: "09:00",
      endTime: "10:00"
    };
    const newPeriods = [...periods, newPeriod];
    setPeriods(newPeriods);
    savePeriods(newPeriods);
  };

  const removePeriod = (index: number) => {
    if (periods.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You must have at least one period",
        variant: "destructive"
      });
      return;
    }
    
    const newPeriods = periods.filter((_, i) => i !== index).map((period, i) => ({
      ...period,
      periodNumber: i + 1
    }));
    
    setPeriods(newPeriods);
    savePeriods(newPeriods);
  };

  const savePeriods = async (periodsToSave: PeriodConfig[]) => {
    // Save to localStorage first as a backup
    localStorage.setItem('period_config', JSON.stringify(periodsToSave));
    
    // Then try to save to the server
    try {
      const response = await fetch('/api/period-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ periods: periodsToSave })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save to server');
      }
    } catch (error) {
      console.error('Error saving to server:', error);
      // Don't show toast to avoid spamming the user since this happens on every change
    }
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
      
      // Try to save to server
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Period Configuration</h1>
        <div className="space-x-2">
          <Button onClick={addPeriod}>
            <Plus className="h-4 w-4 mr-2" />
            Add Period
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

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
    </div>
  );
}
