import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Clock,
  Home,
  Users,
  MessageSquare,
  BookOpen,
  MoreHorizontal,
  RefreshCcw,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Types
interface Teacher {
  id: number;
  name: string;
  isSubstitute: boolean;
  phoneNumber: string | null;
}

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

interface ClassInfo {
  className: string;
  teacher: string;
  status: 'absent' | 'substitute' | 'present';
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Helper functions
function getCurrentPeriodFromConfig(periodConfigs: PeriodConfig[]): number | null {
  if (!periodConfigs?.length) return null;

  const now = new Date();
  const currentTimeStr = format(now, 'HH:mm');

  for (const config of periodConfigs) {
    if (config.startTime <= currentTimeStr && currentTimeStr <= config.endTime) {
      return config.periodNumber;
    }
  }

  return null;
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);

  // Fetch period configuration
  const { data: periodConfigs, isLoading: loadingPeriodConfigs } = useQuery({
    queryKey: ["/api/period-config"],
    queryFn: async () => {
      const res = await fetch('/api/period-config');
      if (!res.ok) throw new Error('Failed to fetch period configuration');
      return res.json() as Promise<PeriodConfig[]>;
    }
  });

  // Fetch absent teachers count
  const { data: absentData, isLoading: loadingAbsent } = useQuery({
    queryKey: ["/api/absent-teachers-count"],
    queryFn: async () => {
      const res = await fetch('/api/absent-teachers-count');
      if (!res.ok) throw new Error('Failed to fetch absent teachers count');
      return res.json() as Promise<{ count: number }>;
    }
  });

  // Fetch schedule data
  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/period-schedules"],
    queryFn: async () => {
      const res = await fetch('/api/period-schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      return res.json();
    }
  });

  // Update current period based on time
  useEffect(() => {
    const updateCurrentPeriod = () => {
      if (periodConfigs) {
        const period = getCurrentPeriodFromConfig(periodConfigs);
        setCurrentPeriod(period);
      }
    };

    updateCurrentPeriod();
    const timer = setInterval(updateCurrentPeriod, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [periodConfigs]);

  const isLoading = loadingPeriodConfigs || loadingAbsent || loadingSchedule;

  // Calculate total classes for today
  const totalClasses = scheduleData ? Object.values(scheduleData).reduce((total: number, periods: any) => {
    return total + Object.values(periods).reduce((sum: number, classes: any[]) => sum + classes.length, 0);
  }, 0) : 0;

  const refreshData = async () => {
    toast({
      title: "Refreshing data",
      description: "Please wait while we update the information..."
    });

    try {
      await queryClient.invalidateQueries();

      toast({
        title: "Success",
        description: "Data has been refreshed"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    }
  };

  const navigationItems = [
    { icon: <Home className="h-6 w-6" />, label: "Home", href: "/" },
    { icon: <Users className="h-6 w-6" />, label: "Attendee", href: "/attendees" },
    { icon: <MessageSquare className="h-6 w-6" />, label: "SMS", href: "/sms-send" },
    { icon: <BookOpen className="h-6 w-6" />, label: "Class", href: "/schedule" },
    { icon: <MoreHorizontal className="h-6 w-6" />, label: "More", href: "/more" }
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header with User Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshData}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCcw className="h-5 w-5" />
          )}
        </Button>
      </motion.div>

      {/* Time and Period Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{format(new Date(), "HH:mm")}</div>
                <div className="text-sm text-muted-foreground">Current Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-secondary" />
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
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          <Link href="/schedule">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div className="text-2xl font-bold">{totalClasses}</div>
                  <p className="text-sm text-muted-foreground">total classes today</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/attendees">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Users className="h-8 w-8 text-primary" />
                  <div className="text-2xl font-bold">{absentData?.count || 0}</div>
                  <p className="text-sm text-muted-foreground">teachers absent today</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/schedule">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Clock className="h-8 w-8 text-primary" />
                  <div className="text-2xl font-bold">{periodConfigs?.length || 0}</div>
                  <p className="text-sm text-muted-foreground">total periods configured</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/notifications">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Bell className="h-8 w-8 text-primary" />
                  <div className="text-2xl font-bold">
                    {currentPeriod ? scheduleData?.[format(new Date(), 'EEEE').toLowerCase()]?.[currentPeriod]?.length || 0 : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">active classes this period</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>

      {/* Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 md:relative md:border-none md:p-0"
      >
        <div className="flex justify-around max-w-lg mx-auto">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "secondary" : "ghost"}
                className="flex flex-col items-center gap-1"
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Current Classes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Current Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPeriod(p => p === 1 ? (periodConfigs?.length || 8) : (p || 1) - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium">
                Period {currentPeriod || '-'}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPeriod(p => !p ? 1 : p === (periodConfigs?.length || 8) ? 1 : p + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduleData?.[format(new Date(), 'EEEE').toLowerCase()]?.[currentPeriod || 1]?.map((schedule: any, index: number) => (
                <Card key={index} className="bg-accent/5">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold">{schedule.className}</h3>
                    <p className="text-sm text-muted-foreground">{schedule.teacherName}</p>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No classes scheduled for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}