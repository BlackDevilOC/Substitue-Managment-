import { useState, useEffect } from "react";
import { PeriodConfig, getPeriodConfig, savePeriodConfig } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Default period times for a typical school day
const DEFAULT_PERIODS: PeriodConfig[] = [
  { periodNumber: 1, startTime: "08:00", endTime: "08:45" },
  { periodNumber: 2, startTime: "08:45", endTime: "09:30" },
  { periodNumber: 3, startTime: "09:30", endTime: "10:15" },
  { periodNumber: 4, startTime: "10:15", endTime: "11:00" },
  { periodNumber: 5, startTime: "11:30", endTime: "12:15" }, // After break
  { periodNumber: 6, startTime: "12:15", endTime: "13:00" },
  { periodNumber: 7, startTime: "13:00", endTime: "13:45" },
  { periodNumber: 8, startTime: "13:45", endTime: "14:30" },
];

export default function PeriodConfigPage() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedPeriods = getPeriodConfig();
    if (savedPeriods.length > 0) {
      setPeriods(savedPeriods);
    } else {
      // Initialize with default periods
      setPeriods(DEFAULT_PERIODS);
    }
  }, []);

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const lastEndTime = lastPeriod.endTime;

    // Calculate new times (45 minutes later)
    const startTime = lastEndTime;
    const endTimeDate = new Date(`2000-01-01T${lastEndTime}`);
    endTimeDate.setMinutes(endTimeDate.getMinutes() + 45);
    const endTime = endTimeDate.toTimeString().slice(0, 5);

    setPeriods([
      ...periods,
      {
        periodNumber: lastPeriod.periodNumber + 1,
        startTime,
        endTime
      }
    ]);
  };

  const removePeriod = (index: number) => {
    if (periods.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot remove the last period",
        variant: "destructive",
      });
      return;
    }

    // Update period numbers after removal
    const updatedPeriods = periods
      .filter((_, i) => i !== index)
      .map((period, i) => ({
        ...period,
        periodNumber: i + 1
      }));

    setPeriods(updatedPeriods);
  };

  const updatePeriod = (index: number, field: keyof PeriodConfig, value: string) => {
    const updatedPeriods = periods.map((period, i) => {
      if (i === index) {
        const updatedPeriod = { ...period, [field]: value };

        // If updating start time, adjust end time to be 45 minutes later
        if (field === "startTime") {
          const startDate = new Date(`2000-01-01T${value}`);
          startDate.setMinutes(startDate.getMinutes() + 45);
          updatedPeriod.endTime = startDate.toTimeString().slice(0, 5);
        }

        return updatedPeriod;
      }
      return period;
    });
    setPeriods(updatedPeriods);
  };

  const handleSave = () => {
    try {
      // Validate times
      for (let i = 0; i < periods.length - 1; i++) {
        const currentEnd = new Date(`2000-01-01T${periods[i].endTime}`);
        const nextStart = new Date(`2000-01-01T${periods[i + 1].startTime}`);

        if (currentEnd > nextStart) {
          throw new Error(`Invalid time sequence between periods ${i + 1} and ${i + 2}`);
        }
      }

      savePeriodConfig(periods);
      toast({
        title: "Success",
        description: "Period configuration saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save period configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-4">
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
          <Card key={index} className="border rounded-lg shadow-sm">
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
                    className="w-full"
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
                    className="w-full"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="mt-6"
                  onClick={() => removePeriod(index)}
                  title="Remove Period"
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