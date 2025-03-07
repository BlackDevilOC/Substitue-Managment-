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
  teacherName: string; // Added teacherName field
}

interface Absence {
  teacherId: number;
  date: string;
  substituteId?: number;
  hasAssignedSubstitute?: boolean; // Added for pendingAssignments calculation
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
function getCurrentPeriodFromConfig(periodConfigs: PeriodConfig[]): number | null {
  if (!periodConfigs?.length) return null;

  const now = new Date();
  const currentTimeStr = format(now, 'HH:mm');

  // Simple string comparison of times should work since they're in HH:mm format
  for (const config of periodConfigs) {
    if (config.startTime <= currentTimeStr && currentTimeStr <= config.endTime) {
      return config.periodNumber;
    }
  }

  return null;
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

// Added StatsCard component
const StatsCard = ({ title, value, icon, description, variant, onClick, className }: {
  title: string;
  value: number;
  icon: React.ReactElement;
  description: string;
  variant: string;
  onClick?: () => void;
  className?: string;
}) => (
  <Card className={`h-full hover:bg-accent/5 transition-colors border-2 hover:${variant === 'danger' ? 'border-destructive' : variant === 'success' ? 'border-success' : variant === 'warning' ? 'border-warning' : 'border-primary'} ${className || ''}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentDay = getDayOfWeek();
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);

  // Enhanced queries with error handling
  const { data: periodConfigs, isLoading: loadingPeriodConfigs } = useQuery({
    queryKey: ["/api/period-config"],
    queryFn: async () => {
      const res = await fetch('/api/period-config');
      if (!res.ok) {
        console.warn('Could not fetch period config');
        throw new Error('Failed to fetch period configuration');
      }
      return res.json() as Promise<PeriodConfig[]>;
    }
  });

  const { data: absentTeachersData, isLoading: loadingAbsentTeachers, refetch: refetchAbsentTeachers } = useQuery({
    queryKey: ["/api/absent-teachers-count"],
    queryFn: async () => {
      const res = await fetch('/api/absent-teachers-count');
      if (!res.ok) {
        throw new Error('Failed to fetch absent teachers count');
      }
      return res.json();
    }
  });

  // Use a safe default if data is not available
  const absentTeachers = absentTeachersData?.teachers || [];
  const absentTeachersCount = absentTeachersData?.count || 0;


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
    const updateCurrentPeriod = () => {
      if (periodConfigs) {
        const period = getCurrentPeriodFromConfig(periodConfigs);
        setCurrentPeriod(period);
      }
    };

    updateCurrentPeriod();
    const timer = setInterval(updateCurrentPeriod, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [periodConfigs]);

  const refreshAll = async () => {
    toast({
      title: "Refreshing data",
      description: "Please wait while we update the information..."
    });

    try {
      await Promise.all([
        refetchAbsentTeachers(),
        refetchPeriodSchedules(),
        queryClient.invalidateQueries({ queryKey: ["/api/period-config"] })
      ]);

      toast({
        title: "Refresh complete",
        description: "All data has been updated"
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to update some data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isLoading = loadingAbsentTeachers || loadingPeriodSchedules || loadingPeriodConfigs;

  const currentTeachers = React.useMemo((): ClassInfo[] => {
    if (!periodSchedules || !currentPeriod) return [];

    const daySchedule = periodSchedules[currentDay] || {};
    const periodData = daySchedule[currentPeriod] || [];

    return periodData.map((schedule: { className: string; teacherName: string }) => {
      const { className, teacherName } = schedule;
      const teacher = teachers?.find(t => t.name === teacherName);

      const isAbsent = absentTeachers?.some(
        a => a.teacherId === teacher?.id &&
          format(new Date(a.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
      );

      let substituteTeacher = null;
      if (isAbsent && teachers) {
        const absence = absentTeachers.find(
          a => a.teacherId === teacher?.id &&
            format(new Date(a.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
        );
        if (absence?.substituteId) {
          substituteTeacher = teachers?.find(t => t.id === absence.substituteId);
        }
      }

      return {
        className,
        teacher: isAbsent
          ? substituteTeacher
            ? `${substituteTeacher.name} (Substitute)`
            : "Teacher Absent"
          : teacherName || "No teacher",
        status: isAbsent
          ? substituteTeacher ? 'substitute' : 'absent'
          : 'present'
      };
    }).sort((a: ClassInfo, b: ClassInfo) => a.className.localeCompare(b.className));
  }, [periodSchedules, currentDay, currentPeriod, absentTeachers, teachers]);

  // Stats calculations
  const totalClasses = React.useMemo(() => {
    if (!periodSchedules || !currentDay) return 0;
    const daySchedule = periodSchedules[currentDay] || {};
    return Object.values(daySchedule).reduce((total, periodData: any[]) => total + periodData.length, 0);
  }, [periodSchedules, currentDay]);

  const pendingAssignments = React.useMemo(() => {
    if (!absentTeachers || !teachers) return 0;
    // Simplified logic - just count teachers without substitutes
    return absentTeachers.filter(teacher => !teacher.hasAssignedSubstitute).length;
  }, [absentTeachers, teachers]);

  const handleAbsentClick = () => {
    // Redirect to the attendees management page.
    window.location.href = '/attendees';
  };

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
                  <div className="text-2xl font-bold">
                    {currentPeriod ? `Period ${currentPeriod}` : 'No Active Period'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentPeriod && periodConfigs?.[currentPeriod - 1]
                      ? `${periodConfigs[currentPeriod - 1].startTime} - ${periodConfigs[currentPeriod - 1].endTime}`
                      : 'Outside school hours'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid with updated counts */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <motion.div variants={item}>
          <Link href="/schedule" className="block">
            <StatsCard title="Today's Schedule" value={totalClasses} icon={<Calendar className="h-5 w-5 text-primary" />} description="total classes today" variant="primary" />
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <StatsCard
            title="Absent Teachers"
            value={absentTeachersCount}
            icon={<UserMinus className="h-5 w-5 text-destructive" />}
            description="teachers absent today"
            variant="danger"
            onClick={handleAbsentClick}
            className="cursor-pointer hover:bg-red-50 transition-colors"
          />
        </motion.div>

        {/* Replace substitute teacher card with total periods */}
        <motion.div variants={item}>
          <StatsCard title="Period Overview" value={periodConfigs?.length || 0} icon={<Clock className="h-5 w-5 text-success" />} description="total periods configured" variant="success" />
        </motion.div>

        <motion.div variants={item}>
          <Link href="/notifications" className="block">
            <StatsCard title="Active Classes" value={currentTeachers.length} icon={<Bell className="h-5 w-5 text-warning" />} description="classes this period" variant="warning" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Current Classes Section with better period handling */}
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
                onClick={() => setCurrentPeriod(p => p === 1 ? (periodConfigs?.length || 8) : (p || 1) - 1)}
                className="w-full sm:w-auto"
              >
                Previous Period
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d")} - {currentPeriod ? `Period ${currentPeriod}` : 'No Active Period'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPeriod(p => !p ? 1 : p === (periodConfigs?.length || 8) ? 1 : p + 1)}
                className="w-full sm:w-auto"
              >
                Next Period
              </Button>
            </div>

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {currentTeachers.length > 0 ? (
                currentTeachers.map(({ className, teacher, status }) => (
                  <motion.div
                    key={className}
                    variants={item}
                    className={`p-4 rounded-lg border-2 ${
                      status === 'absent' ? "bg-destructive/5 border-destructive/20" :
                        status === 'substitute' ? "bg-warning/5 border-warning/20" :
                          "bg-card hover:bg-accent/5"
                    }`}
                  >
                    <div className="font-medium text-lg mb-2">{className.toUpperCase()}</div>
                    <div className={`text-sm ${
                      status === 'absent' ? "text-destructive" :
                        status === 'substitute' ? "text-warning-foreground" :
                          "text-muted-foreground"
                    }`}>
                      {teacher}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  No classes scheduled for this period
                </div>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}