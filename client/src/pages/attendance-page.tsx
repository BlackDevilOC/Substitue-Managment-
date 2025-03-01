import { useQuery } from "@tanstack/react-query";
import { Teacher } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, Download } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

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

  // Load teachers from API
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch('/api/teachers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch teachers');
      }
      return res.json();
    }
  });

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    if (!teachers.length) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const storedData = localStorage.getItem(`attendance_${dateStr}`);

    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      teachers.forEach(teacher => {
        initialAttendance[teacher.id] = 'present';
      });
      setLocalAttendance(initialAttendance);
      localStorage.setItem(`attendance_${dateStr}`, JSON.stringify(initialAttendance));
    }
  }, [selectedDate, teachers]);

  // Function to manage absent teachers for substitute assignment
  const updateAbsentTeachersFile = async (teacherId: number, status: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let absentTeachers: AbsentTeacherData[] = [];
      const existingData = localStorage.getItem('absent_teacher_for_substitute');

      if (existingData) {
        absentTeachers = JSON.parse(existingData);
      }

      if (status === 'absent') {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        const existingIndex = absentTeachers.findIndex(
          t => t.teacherId === teacherId && t.date === dateStr
        );

        if (existingIndex === -1) {
          const dayName = format(selectedDate, 'EEEE').toLowerCase();
          const scheduleRes = await fetch(`/api/schedule/${dayName}/${teacherId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
            }
          });

          if (!scheduleRes.ok) {
            throw new Error(`Failed to fetch schedule for teacher ${teacherId}`);
          }

          const schedule = await scheduleRes.json();

          absentTeachers.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            phone: teacher.phoneNumber,
            date: dateStr,
            periods: schedule.map((s: any) => ({
              period: s.period,
              className: s.className
            }))
          });
        }
      } else {
        absentTeachers = absentTeachers.filter(
          t => !(t.teacherId === teacherId && t.date === dateStr)
        );
      }

      localStorage.setItem('absent_teacher_for_substitute', JSON.stringify(absentTeachers));

      // Update server
      await fetch('/api/absences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        },
        body: JSON.stringify({
          teacherId,
          date: dateStr,
          status
        })
      });

    } catch (error) {
      console.error('Error updating absent teachers:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance. Changes saved locally.",
        variant: "destructive",
      });
    }
  };

  const exportAttendance = () => {
    const monthName = format(selectedDate, 'MMMM');
    const year = selectedDate.getFullYear();

    let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
    csvContent += "Teacher Name,";

    const daysInMonth = new Date(year, selectedDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      csvContent += `${i},`;
    }
    csvContent += "Total Present,Total Absent\n";

    teachers.forEach(teacher => {
      csvContent += `${teacher.name},`;

      let presentCount = 0;
      let absentCount = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const checkDate = new Date(year, selectedDate.getMonth(), i);
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const attendanceData = localStorage.getItem(`attendance_${dateStr}`);

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
          csvContent += ',';
        }
      }

      csvContent += `${presentCount},${absentCount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${monthName}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const markAttendance = async (teacherId: number, newStatus: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const newAttendance = {
        ...localAttendance,
        [teacherId]: newStatus
      };

      // Update local storage
      setLocalAttendance(newAttendance);
      localStorage.setItem(`attendance_${dateStr}`, JSON.stringify(newAttendance));

      // Update absent teachers list for substitute assignment
      await updateAbsentTeachersFile(teacherId, newStatus);

      toast({
        title: "Attendance marked",
        description: `Marked ${newStatus} for ${teachers.find(t => t.id === teacherId)?.name}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
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
        {teachers.map((teacher) => {
          const status = localAttendance[teacher.id] || 'present';
          const isAbsent = status === 'absent';

          return (
            <Card
              key={teacher.id}
              className={`relative cursor-pointer transition-colors
                ${isAbsent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
              onClick={() => markAttendance(teacher.id, isAbsent ? 'present' : 'absent')}
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