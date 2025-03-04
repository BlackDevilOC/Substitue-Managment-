import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Demo data for UI display
const demoTeachers = [
  { id: 1, name: "John Smith", phone: "123-456-7890", status: "present" },
  { id: 2, name: "Sarah Johnson", phone: "234-567-8901", status: "absent" },
  { id: 3, name: "Michael Brown", phone: "345-678-9012", status: "present" },
  { id: 4, name: "Emily Davis", phone: "456-789-0123", status: "present" },
  { id: 5, name: "David Wilson", phone: "567-890-1234", status: "absent" },
];

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teachers, setTeachers] = useState(demoTeachers);

  const toggleStatus = (teacherId: number) => {
    setTeachers(prevTeachers =>
      prevTeachers.map(teacher =>
        teacher.id === teacherId
          ? { ...teacher, status: teacher.status === "present" ? "absent" : "present" }
          : teacher
      )
    );
  };

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
        {teachers.map((teacher) => (
          <Card
            key={teacher.id}
            className={`relative cursor-pointer transition-colors ${
              teacher.status === "absent" ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
            }`}
            onClick={() => toggleStatus(teacher.id)}
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
                <span className={`text-sm font-medium ${
                  teacher.status === "absent" ? "text-red-600" : "text-green-600"
                }`}>
                  {teacher.status === "absent" ? "Absent" : "Present"}
                </span>
                <div className={`w-3 h-3 rounded-full ${
                  teacher.status === "absent" ? "bg-red-500" : "bg-green-500"
                }`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}