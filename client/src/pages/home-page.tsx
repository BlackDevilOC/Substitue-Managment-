import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut, Clock, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import React, { useState } from "react";
import { NetworkStatus } from "@/components/ui/network-status";

// Types for our data
interface Teacher {
  id: number;
  name: string;
  isSubstitute: boolean;
}

interface Schedule {
  period: number;
  teacherId: number;
  className: string;
}

interface Absence {
  teacherId: number;
  date: string;
  substituteId?: number;
}

interface ClassInfo {
  className: string;
  teacher: string;
}

// Helper functions
function getCurrentPeriod(): number {
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

function getDayOfWeek(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentDay = getDayOfWeek();
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());

  // Queries with refresh functionality
  const { data: currentSchedule, isLoading: loadingSchedule, refetch: refetchSchedule } = useQuery({
    queryKey: ["/api/schedule", currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/schedule/${currentDay}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch schedule');
      }
      return res.json() as Promise<Schedule[]>;
    }
  });

  const { data: absences, isLoading: loadingAbsences, refetch: refetchAbsences } = useQuery({
    queryKey: ["/api/absences"],
    queryFn: async () => {
      const res = await fetch('/api/absences');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch absences');
      }
      return res.json() as Promise<Absence[]>;
    }
  });

  const { data: teachers, isLoading: loadingTeachers, refetch: refetchTeachers } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch('/api/teachers');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch teachers');
      }
      return res.json() as Promise<Teacher[]>;
    }
  });

  const refreshAll = async () => {
    toast({
      title: "Refreshing data",
      description: "Please wait while we update the information..."
    });

    await Promise.all([
      refetchSchedule(),
      refetchAbsences(),
      refetchTeachers()
    ]);

    toast({
      title: "Refresh complete",
      description: "All data has been updated"
    });
  };

  const isLoading = loadingAbsences || loadingTeachers || loadingSchedule;

  const currentTeachers = React.useMemo((): ClassInfo[] => {
    if (!currentSchedule || !teachers || !absences) return [];
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return currentSchedule
      .filter((s: Schedule) => s.period === currentPeriod)
      .map((schedule: Schedule) => {
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <NetworkStatus />

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {user?.username}!</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {teachers?.filter((t: Teacher) => t.isSubstitute)?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">available substitutes</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Current Classes Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Classes
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
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