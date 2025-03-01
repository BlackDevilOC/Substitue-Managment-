import { useState, useEffect } from "react";
import { PeriodConfig, getPeriodConfig, savePeriodConfig } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PeriodConfigPage() {
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedPeriods = getPeriodConfig();
    if (savedPeriods.length > 0) {
      setPeriods(savedPeriods);
    } else {
      // Initialize with a default period
      setPeriods([{ periodNumber: 1, startTime: "08:00", endTime: "09:00" }]);
    }
  }, []);

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    setPeriods([
      ...periods,
      {
        periodNumber: lastPeriod.periodNumber + 1,
        startTime: lastPeriod.endTime,
        endTime: "00:00"
      }
    ]);
  };

  const removePeriod = (index: number) => {
    setPeriods(periods.filter((_, i) => i !== index));
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
    try {
      savePeriodConfig(periods);
      toast({
        title: "Success",
        description: "Period configuration saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save period configuration",
        variant: "destructive",
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
