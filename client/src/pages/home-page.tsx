import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut, Clock, RefreshCcw, Bell, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format, parse, isWithinInterval } from "date-fns";
import React, { useState, useEffect } from "react";
import { NetworkStatus } from "@/components/ui/network-status";
import { motion } from "framer-motion";

// Types for our data
interface Teacher {
  id: number;
  name: string;
  isSubstitute: boolean;
  phoneNumber: string | null;
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
  status: 'absent' | 'substitute' | 'present';
}

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

// Helper functions
function getCurrentPeriodFromConfig(periodConfigs: PeriodConfig[]): number {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  for (const config of periodConfigs) {
    const start = parse(config.startTime, 'HH:mm', new Date());
    const end = parse(config.endTime, 'HH:mm', new Date());

    if (isWithinInterval(now, { start, end })) {
      return config.periodNumber;
    }
  }

  return 1; // Default to first period if no match
}

function getDayOfWeek(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentDay = getDayOfWeek();
  const [currentPeriod, setCurrentPeriod] = useState(1);

  // Enhanced queries with error handling
  const { data: periodConfigs, isLoading: loadingPeriodConfigs } = useQuery({
    queryKey: ["/api/period-config"],
    queryFn: async () => {
      const res = await fetch('/api/period-config');
      if (!res.ok) {
        console.warn('Could not fetch period config, using default');
        return null;
      }
      return res.json() as Promise<PeriodConfig[]>;
    }
  });

  const { data: periodSchedules, isLoading: loadingPeriodSchedules, refetch: refetchPeriodSchedules } = useQuery({
    queryKey: ["/api/period-schedules"],
    queryFn: async () => {
      const res = await fetch('/api/period-schedules');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch period schedules');
      }
      return res.json();
    }
  });

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

  // Update current period based on period config
  useEffect(() => {
    if (periodConfigs) {
      const period = getCurrentPeriodFromConfig(periodConfigs);
      setCurrentPeriod(period);
    }

    const timer = setInterval(() => {
      if (periodConfigs) {
        const period = getCurrentPeriodFromConfig(periodConfigs);
        setCurrentPeriod(period);
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [periodConfigs]);

  const refreshAll = async () => {
    toast({
      title: "Refreshing data",
      description: "Please wait while we update the information..."
    });

    await Promise.all([
      refetchSchedule(),
      refetchAbsences(),
      refetchTeachers(),
      refetchPeriodSchedules()
    ]);

    toast({
      title: "Refresh complete",
      description: "All data has been updated"
    });
  };

  const isLoading = loadingAbsences || loadingTeachers || loadingSchedule || loadingPeriodSchedules || loadingPeriodConfigs;

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
            : teacher?.name || "No teacher",
          status: isAbsent
            ? substituteTeacher ? 'substitute' : 'absent'
            : 'present'
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [currentSchedule, teachers, absences, currentPeriod]);

  return (
    <div className="container mx-auto px-4 py-6">
      <NetworkStatus />

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {user?.username}!</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={isLoading}
            className="relative"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
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
      </motion.div>

      {/* Current Time and Period Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{format(new Date(), "HH:mm")}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(), "EEEE, MMMM d")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">Period {currentPeriod}</div>
                  <div className="text-sm text-muted-foreground">
                    {periodConfigs?.[currentPeriod - 1]?.startTime} - {periodConfigs?.[currentPeriod - 1]?.endTime}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={item}>
          <Link href="/schedule" className="block">
            <Card className="h-full hover:bg-accent/5 transition-colors border-2 hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{periodSchedules?.length || 0}</p>
                <p className="text-sm text-muted-foreground">total periods today</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/absences" className="block">
            <Card className="h-full hover:bg-accent/5 transition-colors border-2 hover:border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <UserMinus className="h-5 w-5 text-destructive" />
                  Absent Teachers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{absences?.length || 0}</p>
                <p className="text-sm text-muted-foreground">teachers marked absent today</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/substitutes" className="block">
            <Card className="h-full hover:bg-accent/5 transition-colors border-2 hover:border-success">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-success" />
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
        </motion.div>

        <motion.div variants={item}>
          <Link href="/notifications" className="block">
            <Card className="h-full hover:bg-accent/5 transition-colors border-2 hover:border-warning">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-warning" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {currentTeachers.filter(t => t.status === 'absent').length}
                </p>
                <p className="text-sm text-muted-foreground">pending assignments</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>

      {/* Current Classes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
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

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
            >
              {currentTeachers.map(({ className, teacher, status }) => (
                <motion.div
                  key={className}
                  variants={item}
                  className={`p-3 rounded-lg border-2 ${
                    status === 'absent' ? "bg-destructive/5 border-destructive/20" :
                      status === 'substitute' ? "bg-warning/5 border-warning/20" :
                        "bg-card hover:bg-accent/5"
                  }`}
                >
                  <div className="font-medium">{className.toUpperCase()}</div>
                  <div className={`text-sm ${
                    status === 'absent' ? "text-destructive" :
                      status === 'substitute' ? "text-warning-foreground" :
                        "text-muted-foreground"
                  }`}>
                    {teacher}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}