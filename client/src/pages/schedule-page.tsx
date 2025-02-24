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
  
  const { data: schedule, isLoading } = useQuery({
    queryKey: ["/api/schedule", selectedDay],
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        {PERIODS.map(period => (
          <Card key={period}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-lg font-semibold">Period {period}</div>
                <div className="grid grid-cols-3 sm:col-span-2 gap-2">
                  {CLASSES.map(className => {
                    const teacherId = schedule?.find(s => 
                      s.period === period && s.className === className
                    )?.teacherId;
                    const teacher = teachers?.find(t => t.id === teacherId);

                    return (
                      <div
                        key={className}
                        className="p-2 text-sm border rounded-md"
                      >
                        <div className="font-medium">{className.toUpperCase()}</div>
                        <div className="text-muted-foreground truncate">
                          {teacher?.name || "No teacher"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
