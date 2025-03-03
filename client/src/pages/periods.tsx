import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface PeriodTime {
  start: string;
  end: string;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<PeriodTime[]>([
    { start: "08:00", end: "08:45" },
    { start: "08:45", end: "09:30" },
    { start: "09:45", end: "10:30" },
    { start: "10:30", end: "11:15" },
    { start: "11:30", end: "12:15" },
    { start: "12:15", end: "13:00" },
    { start: "13:00", end: "13:45" },
    { start: "13:45", end: "14:30" },
  ]);

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

  const currentPeriod = getCurrentPeriod();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Period Times</h1>
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
    </div>
  );
}
