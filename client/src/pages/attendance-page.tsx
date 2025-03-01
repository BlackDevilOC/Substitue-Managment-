import { useQuery, useMutation } from "@tanstack/react-query";
import { Teacher } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Download } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { defaultTeachers, getAttendanceKey, type TeacherAttendanceRecord } from "@/data/teachers";

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phone?: string;
  date: string;
  periods: Array<{ period: number; className: string }>;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);

  // Load teachers from API or use default data
  const { data: teachers, isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/teachers', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch teachers');
        const data = await res.json();
        return data.length > 0 ? data : defaultTeachers;
      } catch (error) {
        console.warn('Failed to fetch teachers, using default data:', error);
        return defaultTeachers;
      }
    }
  });

  // Load attendance records from localStorage on mount
  useEffect(() => {
    const storedRecords = localStorage.getItem('teacherAttendanceRecords');
    if (storedRecords) {
      setAttendanceRecords(JSON.parse(storedRecords));
    } else if (teachers) {
      // Initialize records for all teachers
      const initialRecords: TeacherAttendanceRecord[] = teachers.map(teacher => ({
        teacherId: teacher.id,
        teacherName: teacher.name,
        attendance: {}
      }));
      setAttendanceRecords(initialRecords);
      localStorage.setItem('teacherAttendanceRecords', JSON.stringify(initialRecords));
    }
  }, [teachers]);

  // Update absent teachers list when marking attendance
  const updateAbsentTeachersFile = async (teacherId: number, status: 'P' | 'A') => {
    if (status !== 'A') return; // Only process absences

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const teacher = teachers?.find(t => t.id === teacherId);
      if (!teacher) return;

      // Get teacher's schedule for the day
      const dayName = format(selectedDate, 'EEEE').toLowerCase();
      try {
        const res = await fetch(`/api/schedule/${dayName}/${teacherId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch schedule');
        const schedule = await res.json();

        // Create absence record
        const absenceData = {
          teacherId,
          date: dateStr,
          schedule: schedule
        };

        // Save to API
        const absenceRes = await fetch('/api/absences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
          },
          body: JSON.stringify(absenceData)
        });

        if (!absenceRes.ok) throw new Error('Failed to record absence');

      } catch (error) {
        console.error('Error updating absence record:', error);
        // Still update local storage even if API fails
      }
    } catch (error) {
      console.error('Error updating absent teachers file:', error);
    }
  };

  const markAttendance = async (teacherId: number, status: 'P' | 'A') => {
    const dateKey = getAttendanceKey(selectedDate);
    const newRecords = attendanceRecords.map(record => {
      if (record.teacherId === teacherId) {
        return {
          ...record,
          attendance: {
            ...record.attendance,
            [dateKey]: status
          }
        };
      }
      return record;
    });

    setAttendanceRecords(newRecords);
    localStorage.setItem('teacherAttendanceRecords', JSON.stringify(newRecords));
    await updateAbsentTeachersFile(teacherId, status);

    // Show confirmation toast
    toast({
      title: "Attendance marked",
      description: `Marked ${status === 'P' ? 'present' : 'absent'} for ${teachers?.find(t => t.id === teacherId)?.name}`,
      duration: 2000,
    });
  };

  const exportAttendance = () => {
    const monthName = format(selectedDate, 'MMMM');
    const year = selectedDate.getFullYear();

    let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
    csvContent += "Teacher Name,";

    // Add dates as columns
    const daysInMonth = new Date(year, selectedDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      csvContent += `${i},`;
    }
    csvContent += "Total Present,Total Absent\n";

    // Add data for each teacher
    attendanceRecords.forEach(record => {
      csvContent += `${record.teacherName},`;

      let presentCount = 0;
      let absentCount = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const checkDate = new Date(year, selectedDate.getMonth(), i);
        const dateKey = getAttendanceKey(checkDate);
        const status = record.attendance[dateKey];

        if (status === 'P') {
          csvContent += 'P,';
          presentCount++;
        } else if (status === 'A') {
          csvContent += 'A,';
          absentCount++;
        } else {
          csvContent += ',';
        }
      }

      csvContent += `${presentCount},${absentCount}\n`;
    });

    // Download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${monthName}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const dateKey = getAttendanceKey(selectedDate);

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
          <Button onClick={exportAttendance}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attendanceRecords.map((record) => {
          const status = record.attendance[dateKey] || 'P';
          const isAbsent = status === 'A';

          return (
            <Card
              key={record.teacherId}
              className={`relative cursor-pointer transition-colors
                ${isAbsent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
              onClick={() => markAttendance(record.teacherId, isAbsent ? 'P' : 'A')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{record.teacherName}</h3>
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