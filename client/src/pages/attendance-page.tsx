import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Example teacher data for UI demonstration
const demoTeachers = [
  { id: 1, name: "John Doe", phone: "123-456-7890" },
  { id: 2, name: "Jane Smith", phone: "098-765-4321" },
  { id: 3, name: "Bob Wilson", phone: "111-222-3333" },
];

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Teacher Attendance</h1>
            <p className="text-muted-foreground">Mark and track teacher attendance</p>
          </div>
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button>Export to Excel</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demoTeachers.map((teacher) => (
          <Card
            key={teacher.id}
            className="relative cursor-pointer transition-colors hover:bg-gray-50"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{teacher.name}</h3>
                {teacher.phone && (
                  <span className="text-sm text-muted-foreground">
                    📱 {teacher.phone}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">
                  Present
                </span>
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
