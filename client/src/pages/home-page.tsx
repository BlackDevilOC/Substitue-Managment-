import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut, Upload, Clock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import React, { useState, useEffect, useMemo } from "react";
import { CSVReader } from 'react-papaparse';

// Type definitions for better type safety
interface Teacher {
  id: number;
  name: string;
  isSubstitute: boolean;
  phoneNumber: string | null;
}

interface Schedule {
  teacherId: number;
  period: number;
  className: string;
}

interface Absence {
  id: number;
  teacherId: number;
  date: string;
  substituteId: number | null;
}

interface TimetableData {
  className: string;
  period: number;
  teacherName: string;
}

// Helper functions
function getCurrentPeriod() {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 9) return 1;
  if (hours < 10) return 2;
  if (hours < 11) return 3;
  if (hours < 12) return 4;
  if (hours < 13) return 5;
  if (hours < 14) return 6;
  if (hours < 15) return 7;
  return 8;
}

function getDayOfWeek() {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());
  const currentDay = getDayOfWeek();
  const [timetableData, setTimetableData] = useState<TimetableData[]>([]);
  const [absentTeachers, setAbsentTeachers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Auto-update current period every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPeriod(getCurrentPeriod());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadTimetableData = async () => {
      try {
        const response = await fetch('/data/timetable.csv');
        const data = await response.text();
        const parsedData = CSVReader.parse(data, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        }).data as TimetableData[];

        setTimetableData(parsedData);
      } catch (error) {
        console.error("Error loading timetable data:", error);
        toast({
          title: "Error loading timetable",
          description: "Failed to load timetable data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const loadAbsentTeachers = async () => {
      try {
        const response = await fetch('/data/absent_teachers.csv');
        const data = await response.text();
        const parsedData = CSVReader.parse(data, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        }).data.map(item => item.teacherName);

        setAbsentTeachers(parsedData);
      } catch (error) {
        console.error("Error loading absent teachers data:", error);
        toast({
          title: "Error loading absent teachers",
          description: "Failed to load absent teachers data.",
          variant: "destructive",
        });
      }
    };

    loadTimetableData();
    loadAbsentTeachers();

  }, []);


  // Improved mutations with better error handling and type safety
  const uploadTimetableMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest('POST', '/api/upload/timetable', formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload timetable');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      toast({
        title: "Success",
        description: `Timetable uploaded successfully. Created ${data.schedulesCreated} schedule entries.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading timetable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadSubstitutesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest('POST', '/api/upload/substitutes', formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload substitute teachers');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Success",
        description: `Substitute teachers uploaded successfully. Added ${data.teachersCreated} teachers.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading substitutes",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Current teacher list based on local timetable data & absent teachers
  const currentTeachers = React.useMemo(() => {
    if (isLoading || !timetableData.length) return [];

    return timetableData
      .filter(schedule => schedule.period === currentPeriod)
      .map(schedule => {
        // Check if teacher is absent
        const isAbsent = absentTeachers.some(
          name => name.toLowerCase() === schedule.teacherName.toLowerCase()
        );

        return {
          className: schedule.className,
          teacher: isAbsent
            ? "Teacher Absent"
            : schedule.teacherName
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [timetableData, absentTeachers, currentPeriod, isLoading]);

  // Improved file upload handlers with validation
  const handleTimetableUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Uploading timetable",
      description: "Please wait while we process your file...",
    });

    uploadTimetableMutation.mutate(file);
  };

  const handleSubstitutesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Uploading substitute teachers",
      description: "Please wait while we process your file...",
    });

    uploadSubstitutesMutation.mutate(file);
  };


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {user?.username}!</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="shrink-0"
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>


      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/schedule" className="block">
          <Card className="h-full hover:bg-accent/5 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage daily schedules</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/absences" className="block">
          <Card className="h-full hover:bg-accent/5 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Absent Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{absentTeachers.length || 0}</p>
              <p className="text-sm text-muted-foreground">teachers marked absent today</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/substitutes" className="block">
          <Card className="h-full hover:bg-accent/5 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Substitute Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {0} {/*Placeholder -  No substitute data loaded locally*/}
              </p>
              <p className="text-sm text-muted-foreground">available substitutes</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Current Classes Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Classes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPeriod(p => p === 1 ? 8 : p - 1)}
              className="w-full sm:w-auto"
            >
              Previous Period
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")} - Period {currentPeriod}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPeriod(p => p === 8 ? 1 : p + 1)}
              className="w-full sm:w-auto"
            >
              Next Period
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {currentTeachers.map(({ className, teacher }) => (
                <div
                  key={className}
                  className={`p-3 rounded-lg border ${
                    teacher === "Teacher Absent" ? "bg-destructive/5 border-destructive/20" :
                      ""
                  }`}
                >
                  <div className="font-medium">{className.toUpperCase()}</div>
                  <div className={`text-sm ${
                    teacher === "Teacher Absent" ? "text-destructive" :
                        "text-muted-foreground"
                  }`}>
                    {teacher}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}