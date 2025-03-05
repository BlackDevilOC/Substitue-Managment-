import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const CLASSES = ["10a", "10b", "10c", "9a", "9b", "9c", "8a", "8b", "8c", "7a", "7b", "7c", "6a", "6b", "6c"];

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  const { data: periodSchedules, isLoading: loadingPeriodSchedules } = useQuery({
    queryKey: ["/api/period-schedules"],
    queryFn: async () => {
      const res = await fetch('/api/period-schedules');
      if (!res.ok) throw new Error('Failed to fetch period schedules');
      return res.json();
    }
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const isLoading = loadingPeriodSchedules || loadingTeachers;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get the schedule for the selected day
  const daySchedule = periodSchedules?.[selectedDay] || {};

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Class Schedule</h1>
        <Select value={selectedDay} onValueChange={setSelectedDay}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map(day => (
              <SelectItem key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {PERIODS.map(period => {
          const periodData = daySchedule[period] || [];

          return (
            <Card key={period}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-lg font-semibold">Period {period}</div>
                  <div className="grid grid-cols-3 sm:col-span-2 gap-2">
                    {CLASSES.map(className => {
                      const classSchedule = periodData.find(
                        (s: any) => s.className.toLowerCase() === className.toLowerCase()
                      );
                      const teacherName = classSchedule?.teacherName || "No teacher";

                      return (
                        <div
                          key={className}
                          className="p-2 text-sm border rounded-md hover:bg-accent/5 transition-colors"
                        >
                          <div className="font-medium">{className.toUpperCase()}</div>
                          <div className="text-muted-foreground truncate">
                            {teacherName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}