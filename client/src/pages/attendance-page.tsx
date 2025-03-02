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
import * as XLSX from 'xlsx';

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phoneNumber?: string | null;
  date: string;
  periods?: { period: number; className: string }[];
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});

  // Keep aggressive refetching for fresh data
  const { data: teachers, isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    const storedData = localStorage.getItem(`attendance_${selectedDate.toISOString().split('T')[0]}`);
    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      teachers?.forEach(teacher => {
        initialAttendance[teacher.id] = 'present';
      });
      setLocalAttendance(initialAttendance);
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(initialAttendance)
      );
    }
  }, [selectedDate, teachers]);

  // Function to manage absent teachers in JSON file
  const updateAbsentTeachersFile = async (teacherId: number, status: string) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get existing data from the JSON file
      let absentTeachers: AbsentTeacherData[] = [];

      try {
        // Try to load data from the server first
        const response = await fetch('/api/get-absent-teachers');
        if (response.ok) {
          absentTeachers = await response.json();
        }
      } catch (error) {
        console.warn('Could not fetch from server, falling back to localStorage');
        // Fallback to localStorage if server fetch fails
        const existingData = localStorage.getItem('absent_teacher_for_substitute');
        if (existingData) {
          absentTeachers = JSON.parse(existingData);
        }
      }

      if (status === 'absent') {
        // Add teacher to absent list if not already present
        const teacher = teachers?.find(t => t.id === teacherId);
        if (!teacher) return;

        // Check if teacher is already in the list for this date
        const existingIndex = absentTeachers.findIndex(
          t => t.teacherId === teacherId && t.date === dateStr
        );

        if (existingIndex === -1) {
          const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

          absentTeachers.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            phoneNumber: teacher.phoneNumber,
            date: dateStr,
          });

          // Update server with teacher name and status
          try {
            await apiRequest("POST", "/api/update-absent-teachers-file", {
              teacherName: teacher.name,
              isAbsent: true
            });
          } catch (error) {
            console.warn('Failed to update server file, changes stored locally only', error);
          }
        }
      } else {
        // Remove teacher from absent list
        const teacherToRemove = teachers?.find(t => t.id === teacherId);
        if (teacherToRemove) {
          absentTeachers = absentTeachers.filter(
            t => !(t.teacherId === teacherId && t.date === dateStr)
          );

          // Update server that teacher is now present
          try {
            await apiRequest("POST", "/api/update-absent-teachers-file", {
              teacherName: teacherToRemove.name,
              isAbsent: false
            });
          } catch (error) {
            console.warn('Failed to update server file, changes stored locally only', error);
          }
        }
      }

      // Save updated list to localStorage as backup
      localStorage.setItem('absent_teacher_for_substitute', JSON.stringify(absentTeachers, null, 2));

    } catch (error) {
      console.error('Error updating absent teachers file:', error);
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
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(newLocalAttendance)
      );
      setLocalAttendance(newLocalAttendance);

      // Update absent teachers file
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
      console.error('Error marking attendance:', error);
    },
  });

  const exportAttendanceToExcel = () => {
    try {
      const monthName = selectedDate.toLocaleString('default', { month: 'long' });
      const year = selectedDate.getFullYear();

      // Create a CSV string
      let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
      csvContent += "Teacher Name,";

      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
        const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
        csvContent += `${i} (${dayName}),`;
      }
      csvContent += "Total Present,Total Absent\n";

      // Create a set to track processed teachers to avoid duplicates
      const processedTeachers = new Map<string, number>();

      teachers?.forEach(teacher => {
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
          const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const storageKey = `attendance_${dateStr}`;
          const attendanceData = localStorage.getItem(storageKey);

          if (attendanceData) {
            const attendance = JSON.parse(attendanceData);
            const status = attendance[teacher.id] || 'present';

            if (status === 'present') {
              csvContent += 'P,';
              presentCount++;
            } else {
              csvContent += 'A,';
              absentCount++;
            }
          } else {
            csvContent += ','; // No data for this day
          }
        }

        csvContent += `${presentCount},${absentCount}\n`;
      });

      // Save the CSV file
      const fileName = `attendance_${monthName}_${year}.csv`;

      // Create a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Attendance report exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting attendance to Excel:', error);
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
                defaultMonth={new Date()} // Set default month to current month
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={exportAttendanceToExcel}>Export to CSV</Button>
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {teachers?.map((teacher, index) => {
          const status = localAttendance[teacher.id] || 'present';
          const isAbsent = status === 'absent';
          const isPending = markAttendanceMutation.isPending;

          return (
            <Card
              key={teacher.id}
              className={`relative cursor-pointer transition-all ${
                isPending ? 'opacity-50' : ''
              } ${
                isAbsent ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'hover:bg-gray-50 border-green-200'
              }`}
              onClick={() => {
                if (!isPending) {
                  markAttendanceMutation.mutate({
                    teacherId: teacher.id,
                    status: isAbsent ? 'present' : 'absent',
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
                  <span className={`text-sm font-medium ${
                    isAbsent ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isAbsent ? 'Absent' : 'Present'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${
                    isAbsent ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}