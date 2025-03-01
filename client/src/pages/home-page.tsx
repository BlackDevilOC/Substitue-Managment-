import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut, Upload, Clock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import React, { useState } from "react";

// Previous helper functions remain unchanged
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

function getInitialPeriod() {
  return getCurrentPeriod();
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentDay = getDayOfWeek();
  const [currentPeriod, setCurrentPeriod] = useState(getInitialPeriod());

  // Queries remain unchanged
  const { data: currentSchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule", currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/schedule/${currentDay}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    }
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
    queryFn: async () => {
      const res = await fetch('/api/absences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch absences');
      return res.json();
    }
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch('/api/teachers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch teachers');
      return res.json();
    }
  });

  // Updated mutations with proper error handling and auth headers
  const uploadTimetableMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/timetable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || 'Failed to upload timetable');
        } catch {
          throw new Error(text || 'Failed to upload timetable');
        }
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
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
      const res = await fetch('/api/upload/substitutes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('currentUser')}`
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || 'Failed to upload substitute teachers');
        } catch {
          throw new Error(text || 'Failed to upload substitute teachers');
        }
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
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

  const isLoading = loadingAbsences || loadingTeachers || loadingSchedule;

  // Current teachers calculation remains unchanged
  const currentTeachers = React.useMemo(() => {
    if (!currentSchedule || !teachers || !absences) return [];
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return currentSchedule
      .filter(s => s.period === currentPeriod)
      .map(schedule => {
        const teacher = teachers.find(t => t.id === schedule.teacherId);
        const isAbsent = absences.some(
          a => a.teacherId === teacher?.id && 
          format(new Date(a.date), "yyyy-MM-dd") === todayStr
        );

        let substituteTeacher = null;
        if (isAbsent) {
          const absence = absences.find(
            a => a.teacherId === teacher?.id && 
            format(new Date(a.date), "yyyy-MM-dd") === todayStr
          );
          if (absence?.substituteId) {
            substituteTeacher = teachers.find(t => t.id === absence.substituteId);
          }
        }

        return {
          className: schedule.className,
          teacher: isAbsent 
            ? substituteTeacher 
              ? `${substituteTeacher.name} (Substitute)`
              : "Teacher Absent"
            : teacher?.name || "No teacher"
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [currentSchedule, teachers, absences, currentPeriod]);

  const handleTimetableUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'text/csv') {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    uploadTimetableMutation.mutate(file);
  };

  const handleSubstitutesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'text/csv') {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upload Card */}
        <Card className="col-span-1 sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleTimetableUpload}
                disabled={uploadTimetableMutation.isPending}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Upload timetable CSV
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleSubstitutesUpload}
                disabled={uploadSubstitutesMutation.isPending}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Upload substitute teachers CSV
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Cards */}
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
              <p className="text-2xl font-bold">{absences?.length || 0}</p>
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
                {teachers?.filter(t => t.isSubstitute)?.length || 0}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {currentTeachers.map(({ className, teacher }) => (
              <div 
                key={className} 
                className={`p-3 rounded-lg border ${
                  teacher === "Teacher Absent" ? "bg-destructive/5 border-destructive/20" :
                  teacher.includes("(Substitute)") ? "bg-warning/5 border-warning/20" :
                  ""
                }`}
              >
                <div className="font-medium">{className.toUpperCase()}</div>
                <div className={`text-sm ${
                  teacher === "Teacher Absent" ? "text-destructive" :
                  teacher.includes("(Substitute)") ? "text-warning-foreground" :
                  "text-muted-foreground"
                }`}>
                  {teacher}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}