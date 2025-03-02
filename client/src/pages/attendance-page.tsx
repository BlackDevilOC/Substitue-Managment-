import { useQuery, useMutation } from "@tanstack/react-query";
import { Teacher } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { updateAbsentTeacher } from "@/utils/absentTeacherManager";

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phoneNumber?: string | null;
  date: string;
  periods: Array<{
    period: number;
    className: string;
  }>;
}

export default function AttendancePage() {
  // Use the current date from the device
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    // Set to beginning of the day to avoid time zone issues
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  // Keep aggressive refetching for fresh data
  const { data: teachers, isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Update current time every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    const storedData = localStorage.getItem(
      `attendance_${selectedDate.toISOString().split("T")[0]}`
    );
    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      teachers?.forEach((teacher) => {
        initialAttendance[teacher.id] = "present";
      });
      setLocalAttendance(initialAttendance);
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split("T")[0]}`,
        JSON.stringify(initialAttendance)
      );
    }
  }, [selectedDate, teachers]);

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      teacherId,
      status,
    }: {
      teacherId: number;
      status: string;
    }) => {
      // Find the teacher
      const teacher = teachers?.find((t) => t.id === teacherId);
      if (!teacher) throw new Error("Teacher not found");

      // Update local storage first for immediate feedback
      const newLocalAttendance = {
        ...localAttendance,
        [teacherId]: status,
      };
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split("T")[0]}`,
        JSON.stringify(newLocalAttendance)
      );
      setLocalAttendance(newLocalAttendance);

      // Update absent teachers using the utility function
      await updateAbsentTeacher(
        teacherId,
        {
          name: teacher.name,
          phone: teacher.phoneNumber
        },
        selectedDate.toISOString().split("T")[0],
        status === "absent"
      );

      // Update server attendance
      try {
        const res = await apiRequest("POST", "/api/attendance", {
          teacherId,
          date: selectedDate.toISOString(),
          status,
        });
        return res.json();
      } catch (error) {
        console.error("Error marking attendance:", error);
        // Still show offline mode toast but don't throw since local changes are saved
        toast({
          title: "Offline mode",
          description: "Changes saved locally. Will sync when online.",
          variant: "default",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
    },
    onError: (error: Error) => {
      console.error("Error marking attendance:", error);
    },
  });

  const exportAttendanceToCSV = () => {
    try {
      const monthName = selectedDate.toLocaleString("default", { month: "long" });
      const year = selectedDate.getFullYear();

      // Create CSV content
      let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
      csvContent += "Teacher Name,";

      const daysInMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
      ).getDate();

      // Add headers with day names
      for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
        const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
        csvContent += `${i} (${dayName}),`;
      }
      csvContent += "Total Present,Total Absent\n";

      // Process teacher data
      teachers?.forEach((teacher) => {
        csvContent += `${teacher.name},`;
        let presentCount = 0;
        let absentCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
          const dateStr = checkDate.toISOString().split("T")[0];
          const storageKey = `attendance_${dateStr}`;
          const attendanceData = localStorage.getItem(storageKey);

          if (attendanceData) {
            const attendance = JSON.parse(attendanceData);
            const status = attendance[teacher.id] || "present";
            if (status === "present") {
              csvContent += "P,";
              presentCount++;
            } else {
              csvContent += "A,";
              absentCount++;
            }
          } else {
            csvContent += ","; // No data
          }
        }

        csvContent += `${presentCount},${absentCount}\n`;
      });

      // Download file
      const fileName = `attendance_${monthName}_${year}.csv`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Attendance exported to ${fileName}`,
      });
    } catch (error) {
      console.error("Error exporting attendance:", error);
      toast({
        title: "Export failed",
        description: "Failed to export attendance report",
        variant: "destructive",
      });
    }
  };

  if (teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Title and Top Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Teacher Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Mark and track teacher attendance
          </p>
          <div className="text-sm text-muted-foreground mt-1">
            Current time: {currentTime} |{" "}
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </div>
        </div>
        <div className="bg-gray-100 p-4 rounded-md">
          <p className="text-lg font-medium">Total Teachers: {teachers?.length || 0}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[140px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                defaultMonth={new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={exportAttendanceToCSV}>Export to CSV</Button>
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {teachers?.map((teacher, index) => {
          const status = localAttendance[teacher.id] || "present";
          const isAbsent = status === "absent";
          const isPending = markAttendanceMutation.isPending;

          return (
            <Card
              key={teacher.id}
              className={`relative cursor-pointer transition-all ${
                isPending ? "opacity-50" : ""
              } ${
                isAbsent
                  ? "bg-red-50 hover:bg-red-100 border-red-200"
                  : "hover:bg-gray-50 border-green-200"
              }`}
              onClick={() => {
                if (!isPending) {
                  markAttendanceMutation.mutate({
                    teacherId: teacher.id,
                    status: isAbsent ? "present" : "absent",
                  });
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">
                    {index + 1}. {teacher.name}
                  </h3>
                  {teacher.phoneNumber && (
                    <span className="text-sm text-muted-foreground">
                      📱 {teacher.phoneNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      isAbsent ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {isAbsent ? "Absent" : "Present"}
                  </span>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isAbsent ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}