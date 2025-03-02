import { useQuery, useMutation } from "@tanstack/react-query";
import { Teacher } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { defaultTeachers } from "@/data/teachers";
import { findTeacherSchedule } from "@/utils/processTeacherData";

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phone?: string;
  date: string;
  periods: Array<{ period: number; className: string }>;
}

export default function AttendancePage() {
  // Use the current date from the device
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    // Set to beginning of the day to avoid time zone issues
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [localAttendance, setLocalAttendance] = useState<
    Record<number, string>
  >({});
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { data: teachers, isLoading: teachersLoading, refetch: refetchTeachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  // Load teachers from CSV when component mounts if needed
  useEffect(() => {
    const loadTeachersFromCSV = async () => {
      try {
        console.log("Loading teachers from CSV files");
        const response = await fetch("/api/load-teachers-from-csv", {
          method: "POST",
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Loaded ${result.teachers?.length || 0} teachers from CSV files`);

          if (result.success) {
            // Refresh the teachers list after loading from CSV
            refetchTeachers();

            // Reset the attendance for today to account for any new teachers
            const todayKey = new Date().toISOString().split("T")[0];
            localStorage.removeItem(`attendance_${todayKey}`);
          }
        }
      } catch (error) {
        console.error("Failed to load teachers from CSV:", error);
      }
    };

    // Check if teachers data is empty before trying to load from CSV
    if (teachers && teachers.length === 0) {
      loadTeachersFromCSV();
    }
  }, [teachers, refetchTeachers]);

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    const storedData = localStorage.getItem(
      `attendance_${selectedDate.toISOString().split("T")[0]}`,
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
        JSON.stringify(initialAttendance),
      );
    }
  }, [selectedDate, teachers]);

  // Update current time every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000); // Update every minute

    return () => clearInterval(timeInterval);
  }, []);

  // Auto-load default teachers if no teachers exist
  useEffect(() => {
    if (!teachers || teachers.length === 0) {
      importTeachersMutation.mutate(defaultTeachers);
    }
  }, [teachers]);

  const importTeachersMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const res = await apiRequest("POST", "/api/import/teachers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      toast({
        title: "Teachers loaded",
        description: "Teacher list has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Loading failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to manage absent teachers in JSON file
  const updateAbsentTeachersFile = async (
    teacherId: number,
    status: string,
  ) => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const teacher = teachers?.find((t) => t.id === teacherId);
      if (!teacher) return;

      // Import the utility function
      const { updateAbsentTeacher } = await import("../utils/absentTeacherManager");
      
      // Update the absent teacher list
      await updateAbsentTeacher(
        teacherId,
        {
          name: teacher.name,
          phone: teacher.phoneNumber
        },
        dateStr,
        status === "absent",
        teacher.schedule as Record<string, number[]>
      );

      // Refresh UI by refetching data
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
    } catch (error) {
      console.error("Error updating absent teachers file:", error);
    }
  };

  const exportAttendanceToExcel = () => {
    try {
      const monthName = selectedDate.toLocaleString("default", {
        month: "long",
      });
      const year = selectedDate.getFullYear();

      // Create a CSV string
      let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
      csvContent += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

      // Add headers - days of month with weekday name
      csvContent += "Teacher Name,";
      const daysInMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
      ).getDate();

      // Create a set to track processed teachers to avoid duplicates
      // Use a Map to track unique teachers by name to prevent duplicates
      const processedTeachers = new Map<string, number>();

      for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          i,
        );
        const dayName = dayDate.toLocaleDateString("en-US", {
          weekday: "short",
        });
        csvContent += `${i} (${dayName}),`;
      }
      csvContent += "Total Present,Total Absent\n";

      // Add data for each teacher (avoid duplicates)
      teachers?.forEach((teacher) => {
        // Skip if we've already processed this teacher name
        const teacherNormalizedName = teacher.name.toLowerCase().trim();
        if (processedTeachers.has(teacherNormalizedName)) {
          return;
        }

        processedTeachers.set(teacherNormalizedName, teacher.id);
        csvContent += `${teacher.name},`;

        let presentCount = 0;
        let absentCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const checkDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            i,
          );
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
            csvContent += ","; // No data for this day
          }
        }

        csvContent += `${presentCount},${absentCount}\n`;
      });

      // Save the CSV file
      const fileName = `attendance_${monthName}_${year}.csv`;
      localStorage.setItem(`attendance_excel_${monthName}_${year}`, csvContent);

      console.log(`Attendance exported to ${fileName}`);

      // Create a download link (works in browser environment)
      if (typeof window !== "undefined") {
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error exporting attendance to Excel:", error);
    }
  };

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      teacherId,
      status,
    }: {
      teacherId: number;
      status: string;
    }) => {
      // Update local storage first
      const newLocalAttendance = {
        ...localAttendance,
        [teacherId]: status,
      };
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split("T")[0]}`,
        JSON.stringify(newLocalAttendance),
      );
      setLocalAttendance(newLocalAttendance);

      // Update absent teachers JSON file
      await updateAbsentTeachersFile(teacherId, status);

      // Then try to update the server
      try {
        const res = await apiRequest("POST", "/api/attendance", {
          teacherId,
          date: selectedDate.toISOString(),
          status,
        });
        return res.json();
      } catch (error) {
        toast({
          title: "Offline mode",
          description: "Changes saved locally. Will sync when online.",
          variant: "default",
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Attendance marked",
        description: "Teacher attendance has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Error marking attendance:", error);
    },
  });

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
          <Button
            onClick={async () => {
              try {
                toast({
                  title: "Loading teachers",
                  description: "Please wait while teachers are loaded from CSV...",
                });

                const response = await fetch("/api/load-teachers-from-csv", {
                  method: "POST",
                });
                const result = await response.json();

                if (result.success) {
                  const duplicateInfo = result.duplicatesFixed && result.duplicatesFixed > 0 
                      ? ` (${result.duplicatesFixed} duplicate names fixed)`
                      : '';

                  toast({
                    title: "Teachers loaded",
                    description: `${result.message} (${result.teachers?.length || 0} unique teachers)${duplicateInfo}`,
                  });

                  // Refresh teachers list
                  await refetchTeachers();

                  // Clear local storage for current date to prevent duplicates
                  const todayKey = selectedDate.toISOString().split("T")[0];
                  localStorage.removeItem(`attendance_${todayKey}`);

                  // Reset the local attendance state
                  setLocalAttendance({});

                  // Clear any existing absent teacher data to start fresh
                  localStorage.removeItem("absent_teacher_for_substitute");
                } else {
                  toast({
                    title: "Error loading teachers",
                    description: result.message,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error("Error loading teachers:", error);
                toast({
                  title: "Error",
                  description: "Failed to load teachers from CSV",
                  variant: "destructive",
                });
              }
            }}
            variant="outline"
          >
            Load Teachers from CSV
          </Button>
          <Button onClick={exportAttendanceToExcel} variant="outline">
            Export to Excel
          </Button>
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
                defaultMonth={new Date()} // Set default month to current month
                initialFocus
              />
            </PopoverContent>
          </Popover>
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
                  {teacher.phone && (
                    <span className="text-sm text-muted-foreground">
                      📱 {teacher.phone}
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