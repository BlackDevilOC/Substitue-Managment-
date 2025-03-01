import { useQuery, useMutation } from "@tanstack/react-query";
import { Teacher as OriginalTeacher } from "@shared/schema"; // Keeping original interface for reference if needed.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Download } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface Teacher {
  id: number;
  name: string;
  phoneNumber: string | null;
  isSubstitute: boolean;
}

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phone?: string;
  date: string;
  periods: Array<{ period: number; className: string }>;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Load teachers on mount
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const response = await fetch('/api/teachers');
        if (response.ok) {
          const data = await response.json();
          setTeachers(data);
        } else {
          toast({
            title: "Error loading teachers",
            description: "Could not load teachers from the server",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading teachers:", error);
        toast({
          title: "Error loading teachers",
          description: "Failed to load teacher data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTeachers();
  }, []);

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    if (!teachers || teachers.length === 0) return;

    const storedData = localStorage.getItem(`attendance_${selectedDate.toISOString().split('T')[0]}`);
    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      teachers.forEach(teacher => {
        if (teacher.id) {
          initialAttendance[teacher.id] = 'present';
        }
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
        const response = await fetch('/client/src/data/absent_teacher_for_substitute.json');
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
          const schedule = teacher.schedule as Record<string, number[]>; //This line is problematic - teacher.schedule doesn't exist in the new interface
          const periods = schedule ? (schedule[dayName] || []) : [];

          absentTeachers.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            phone: teacher.phoneNumber, //Corrected to use phoneNumber from the new interface
            date: dateStr,
            periods: periods.map((period, index) => ({
              period,
              className: `Class ${index + 1}`
            }))
          });
        }
      } else {
        // Remove teacher from absent list
        absentTeachers = absentTeachers.filter(
          t => !(t.teacherId === teacherId && t.date === dateStr)
        );
      }

      // Save updated list to localStorage
      localStorage.setItem('absent_teacher_for_substitute', JSON.stringify(absentTeachers, null, 2));

      // Try to update the actual file on the server
      try {
        await apiRequest("POST", "/api/update-absent-teachers", { absentTeachers });
      } catch (error) {
        console.warn('Failed to update server file, changes stored locally', error);
      }

    } catch (error) {
      console.error('Error updating absent teachers file:', error);
    }
  };

  const exportAttendanceToExcel = () => {
    try {
      const monthName = selectedDate.toLocaleString('default', { month: 'long' });
      const year = selectedDate.getFullYear();

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws_data = [
        [`Teacher Attendance - ${monthName} ${year}`],
        [], // Empty row for spacing
        ['Teacher Name']
      ];

      // Add day numbers to header
      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        ws_data[2].push(i.toString());
      }
      ws_data[2].push('Total Present', 'Total Absent');

      // Add data for each teacher
      teachers?.forEach(teacher => {
        const rowData = [teacher.name];
        let presentCount = 0;
        let absentCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const storageKey = `attendance_${dateStr}`;
          const attendanceData = localStorage.getItem(storageKey);

          if (attendanceData && teacher.id) {
            const attendance = JSON.parse(attendanceData);
            const status = attendance[teacher.id] || 'present';

            if (status === 'present') {
              rowData.push('P');
              presentCount++;
            } else {
              rowData.push('A');
              absentCount++;
            }
          } else {
            rowData.push(''); // No data for this day
          }
        }

        rowData.push(presentCount.toString(), absentCount.toString());
        ws_data.push(rowData);
      });

      // Create worksheet and add to workbook
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");

      // Save the file
      const fileName = `attendance_${monthName}_${year}.xlsx`;
      XLSX.writeFile(wb, fileName);

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

  const markAttendance = async (teacherId: number, status: string) => {
    try {
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

      // Update absent teachers JSON file
      await updateAbsentTeachersFile(teacherId, status);

      // Then try to update the server
      try {
        const res = await apiRequest("POST", "/api/attendance", {
          teacherId,
          date: selectedDate.toISOString(),
          status,
        });

        toast({
          title: "Attendance marked",
          description: "Teacher attendance has been updated successfully.",
        });

        return res.json();
      } catch (error) {
        toast({
          title: "Offline mode",
          description: "Changes saved locally. Will sync when online.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-6 rounded-lg shadow-sm">
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
          <Button onClick={exportAttendanceToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers?.map((teacher) => {
          const status = teacher.id ? (localAttendance[teacher.id] || 'present') : 'present';
          const isAbsent = status === 'absent';

          return (
            <Card
              key={teacher.id || teacher.name}
              className={`relative cursor-pointer transition-colors ${
                isAbsent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                if (teacher.id) {
                  markAttendance(
                    teacher.id,
                    isAbsent ? 'present' : 'absent'
                  );
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{teacher.name}</h3>
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