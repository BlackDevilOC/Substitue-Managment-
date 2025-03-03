import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Teacher } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { defaultTeachers } from "@/data/teachers";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "wouter";

interface AbsentTeacherData {
  teacherId: number;
  teacherName: string;
  phoneNumber?: string;
  date: string;
  periods: Array<{ period: number; className: string }>;
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
    }
  }, [user, authLoading, navigate]);

  const { data: teachers, isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    if (!user) return; // Don't load data if not authenticated

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
  }, [selectedDate, teachers, user]);

  // Auto-load default teachers if no teachers exist
  useEffect(() => {
    if (user && (!teachers || teachers.length === 0)) {
      importTeachersMutation.mutate(defaultTeachers);
    }
  }, [teachers, user]);

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
  const updateAbsentTeachersFile = async (teacherId: number, status: string) => {
    if (!user) return; // Don't update if not authenticated

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      let absentTeachers: AbsentTeacherData[] = [];

      try {
        const response = await apiRequest("GET", "/api/absent-teachers");
        if (response.ok) {
          absentTeachers = await response.json();
        }
      } catch (error) {
        console.warn('Could not fetch from server, falling back to localStorage');
        const existingData = localStorage.getItem('absent_teacher_for_substitute');
        if (existingData) {
          absentTeachers = JSON.parse(existingData);
        }
      }

      if (status === 'absent') {
        const teacher = teachers?.find(t => t.id === teacherId);
        if (!teacher) return;

        const existingIndex = absentTeachers.findIndex(
          t => t.teacherId === teacherId && t.date === dateStr
        );

        if (existingIndex === -1) {
          const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

          absentTeachers.push({
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

      localStorage.setItem('absent_teacher_for_substitute', JSON.stringify(absentTeachers, null, 2));

      try {
        await apiRequest("POST", "/api/update-absent-teachers", { absentTeachers });
      } catch (error) {
        console.warn('Failed to update server file, changes stored locally', error);
      }
    } catch (error) {
      console.error('Error updating absent teachers file:', error);
      toast({
        title: "Error",
        description: "Failed to update absent teachers list",
        variant: "destructive",
      });
    }
  };

  const exportAttendanceToExcel = () => {
    if (!user || !teachers) return;

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

      teachers.forEach(teacher => {
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

      toast({
        title: "Export successful",
        description: `Attendance data exported to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting attendance to Excel:', error);
      toast({
        title: "Export failed",
        description: "Failed to export attendance data",
        variant: "destructive",
      });
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
      if (!user) throw new Error("Not authenticated");

      const newLocalAttendance = {
        ...localAttendance,
        [teacherId]: status,
      };
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(newLocalAttendance)
      );
      setLocalAttendance(newLocalAttendance);

      await updateAbsentTeachersFile(teacherId, status);

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
      if (error.message === "Not authenticated") {
        navigate("/auth");
      }
    },
  });

  const refreshTeacherData = async () => {
    try {
      toast({
        title: "Processing...",
        description: "Extracting and processing teacher data...",
      });

      const response = await apiRequest("POST", "/api/refresh-teachers");
      const result = await response.json();

      // Refresh the data in the UI
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });

      toast({
        title: "Success",
        description: `Teacher data refreshed. Found ${result.teacherCount} teachers.`,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh teacher data",
        variant: "destructive",
      });
    }
  };

  if (authLoading || teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-border/10 bg-accent/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Teacher Attendance</h1>
              <p className="text-muted-foreground">
                Mark and track teacher attendance records
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[240px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button 
                onClick={exportAttendanceToExcel}
                className="w-full sm:w-auto"
              >
                Export to Excel
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="rounded-md bg-primary/10 px-4 py-2 text-sm">
              <span className="font-medium text-primary">Total Teachers:</span>
              <span className="ml-2 font-bold text-primary">{teachers?.length || 0}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={refreshTeacherData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers?.map((teacher) => {
              const status = localAttendance[teacher.id] || 'present';
              const isAbsent = status === 'absent';
              const isPending = markAttendanceMutation.isPending;

              return (
                <Card
                  key={teacher.id}
                  className={`relative cursor-pointer transition-all hover:scale-[1.02] ${
                    isPending ? 'opacity-50' : ''
                  } ${
                    isAbsent ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-accent/5'
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
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold truncate">{teacher.name}</h3>
                      {teacher.phoneNumber && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          📱 {teacher.phoneNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isAbsent ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
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
      </div>
    </div>
  );
}