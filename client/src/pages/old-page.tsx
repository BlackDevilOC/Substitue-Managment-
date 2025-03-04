import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function AttendancePage() {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Teacher Attendance</h1>
            <p className="text-muted-foreground">Mark and track teacher attendance</p>
          </div>
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button>Export to csv</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((id) => (
          <Card
            key={id}
            className="relative cursor-pointer transition-colors hover:bg-gray-50"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Teacher {id}</h3>
                <span className="text-sm text-muted-foreground">
                  📱 123-456-789{id}
                </span>
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