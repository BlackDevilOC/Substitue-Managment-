import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2, RotateCcw } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Teacher } from "@shared/schema"
import { Card, CardContent } from "@/components/ui/card"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface TeacherWithId extends Teacher {
  id: number;
}

const TeacherCardSkeleton = () => (
  <Card className="relative">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

export default function Attendees() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({})

  const { toast } = useToast();

  // Fetch teachers using React Query
  const { data: localTeachers = [], isLoading: teachersLoading, refetch: refetchTeachers } = useQuery<TeacherWithId[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const response = await fetch("/api/teachers");
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      return response.json();
    }
  });

  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      toast({
        title: "Processing...",
        description: "Reloading teacher data...",
      });

      await refetchTeachers();

      toast({
        title: "Success",
        description: `Teacher data refreshed. Found ${localTeachers.length} teachers.`,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh teacher data",
        variant: "destructive"
      });
    }
  };

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    const storedData = localStorage.getItem(`attendance_${selectedDate.toISOString().split('T')[0]}`);
    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      localTeachers?.forEach((teacher: TeacherWithId) => {
        initialAttendance[teacher.id] = 'present';
      });
      setLocalAttendance(initialAttendance);
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(initialAttendance)
      );
    }
  }, [selectedDate, localTeachers]);

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      teacherId,
      status,
    }: {
      teacherId: number;
      status: string;
    }) => {
      const teacher = localTeachers.find((t: TeacherWithId) => t.id === teacherId);
      if (!teacher) throw new Error('Teacher not found');

      // First update local storage
      const newLocalAttendance = {
        ...localAttendance,
        [teacherId]: status,
      };
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(newLocalAttendance)
      );
      setLocalAttendance(newLocalAttendance);

      // Then call the API
      const response = await fetch('/api/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          teacherName: teacher.name,
          phoneNumber: teacher.phoneNumber || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark attendance');
      }

      // Update absent teachers in local storage
      await updateAbsentTeachersFile(teacherId, status);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Attendance marked",
        description: "Teacher attendance has been updated.",
      });
    },
    onError: (error: Error) => {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance.",
        variant: "destructive"
      });
    },
  });

  const updateAbsentTeachersFile = async (teacherId: number, status: string) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      let absentTeachers: Array<{
        id: number;
        teacherId: number;
        teacherName: string;
        phoneNumber?: string;
        date: string;
        periods: Array<{ period: number; className: string }>;
      }> = [];

      const existingData = localStorage.getItem('absent_teachers');
      if (existingData) {
        absentTeachers = JSON.parse(existingData);
      }

      if (status === 'absent') {
        const teacher = localTeachers.find((t: TeacherWithId) => t.id === teacherId);
        if (!teacher) return;

        const existingIndex = absentTeachers.findIndex(
          t => t.teacherId === teacherId && t.date === dateStr
        );

        if (existingIndex === -1) {
          // Get the last ID or start from 1
          const lastId = absentTeachers.length > 0 
            ? Math.max(...absentTeachers.map(t => t.id)) 
            : 0;

          absentTeachers.push({
            id: lastId + 1,
            teacherId: teacher.id,
            teacherName: teacher.name,
            phoneNumber: teacher.phoneNumber || undefined,
            date: dateStr,
            periods: []
          });
        }
      } else {
        absentTeachers = absentTeachers.filter(
          t => !(t.teacherId === teacherId && t.date === dateStr)
        );
      }

      localStorage.setItem('absent_teachers', JSON.stringify(absentTeachers, null, 2));

      toast({
        title: "Attendance recorded",
        description: status === 'absent'
          ? "Teacher marked as absent and saved to records."
          : "Teacher marked as present and removed from absent records.",
      });
    } catch (error) {
      console.error('Error updating absent teachers in storage:', error);
      toast({
        title: "Error saving data",
        description: "Failed to save teacher attendance records.",
        variant: "destructive"
      });
    }
  };

  const handleExportToExcel = () => {
    try {
      const monthName = selectedDate.toLocaleString('default', { month: 'long' });
      const year = selectedDate.getFullYear();

      let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;
      csvContent += "Teacher Name,";

      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        csvContent += `${i},`;
      }
      csvContent += "Total Present,Total Absent\n";

      localTeachers?.forEach((teacher: TeacherWithId) => {
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
            csvContent += ',';
          }
        }

        csvContent += `${presentCount},${absentCount}\n`;
      });

      const fileName = `attendance_${monthName}_${year}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting attendance to Excel:', error);
      toast({
        title: "Export Error",
        description: "Failed to export attendance data",
        variant: "destructive"
      });
    }
  };

  if (teachersLoading) {
    return (
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="bg-card p-6 rounded-lg shadow-sm space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <div className="flex justify-center items-center gap-2 py-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-4 items-center">
              <Skeleton className="h-9 w-[140px]" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <TeacherCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-sm space-y-4">
        <h1 className="text-3xl font-bold text-center">Teacher Attendance</h1>

        <div className="flex justify-center items-center gap-2 py-2">
          <div className="px-4 py-2 bg-primary/10 rounded-md">
            <span className="text-sm font-medium text-primary">Total Teachers:</span>
            <span className="text-sm font-bold text-primary ml-2">{localTeachers?.length || 0}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={teachersLoading}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-center sm:text-left">
            Mark and track teacher attendance
          </p>
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
            <Button onClick={handleExportToExcel}>Export to Excel</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localTeachers?.map((teacher: TeacherWithId) => {
          const status = localAttendance[teacher.id] || 'present';
          const isAbsent = status === 'absent';
          const isPending = markAttendanceMutation.isPending;

          return (
            <Card
              key={teacher.id}
              className={`relative cursor-pointer transition-colors ${
                isPending ? 'opacity-50' : ''
              } ${
                isAbsent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
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