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

function getCurrentPeriod() {
  const now = new Date();
  const hours = now.getHours();
  // This is a simple mapping, adjust the times according to your school schedule
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

  const { data: currentSchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule", currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/schedule/${currentDay}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    }
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const uploadTimetableMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/timetable', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload timetable');
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
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload substitute teachers');
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

  // Update the currentTeachers memo to include absence checks
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

        // If teacher is absent, try to find substitute
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".csv"
              onChange={handleTimetableUpload}
              disabled={uploadTimetableMutation.isPending}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Upload timetable CSV
            </p>
          </div>
          <div>
            <Input
              type="file"
              accept=".csv"
              onChange={handleSubstitutesUpload}
              disabled={uploadSubstitutesMutation.isPending}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Upload substitute teachers CSV
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  {format(new Date(), "EEEE, MMMM d")} - Period {currentPeriod}
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {currentTeachers.map(({ className, teacher }) => (
                    <div 
                      key={className} 
                      className={`flex flex-col p-3 border rounded-md ${
                        teacher === "Teacher Absent" ? "bg-red-50" :
                        teacher.includes("(Substitute)") ? "bg-yellow-50" :
                        "bg-white"
                      }`}
                    >
                      <span className="font-medium text-lg mb-1">{className.toUpperCase()}</span>
                      <span className={`text-sm ${
                        teacher === "Teacher Absent" ? "text-red-600" :
                        teacher.includes("(Substitute)") ? "text-yellow-600" :
                        "text-muted-foreground"
                      }`}>{teacher}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setCurrentPeriod(p => p === 8 ? 1 : p + 1)}>Next Period</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">View and manage daily schedules</p>
                <Link href="/schedule">
                  <Button className="w-full mt-4">View Schedule</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5" />
                  Absent Teachers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{absences?.length || 0}</p>
                <p className="text-muted-foreground">teachers marked absent today</p>
                <Link href="/absences">
                  <Button className="w-full mt-4">Manage Absences</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Substitute Teachers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {teachers?.filter(t => t.isSubstitute)?.length || 0}
                </p>
                <p className="text-muted-foreground">available substitutes</p>
                <Link href="/substitutes">
                  <Button className="w-full mt-4">View Substitutes</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}