import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Wand2, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Assignment {
  absence: {
    id: number;
    teacherId: number;
    date: string;
    substituteId?: number;
  };
  teacher: {
    id: number;
    name: string;
  };
  substitute?: {
    id: number;
    name: string;
  };
  schedules: Array<{
    id: number;
    className: string;
    period: number;
  }>;
}

interface TeacherWorkload {
  teacherId: number;
  name: string;
  classCount: number;
  lastUpdated: string;
}

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: absences = [] } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["/api/schedule", today],
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/substitute-assignments"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      // Clear assignments
      localStorage.removeItem('assignments');
      localStorage.removeItem('teacherWorkloads');
      return await fetch("/api/reset-assignments", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      toast({
        title: "Reset Complete",
        description: "All assignments have been cleared.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auto-assign-substitutes", {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to auto-assign substitutes");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      updateTeacherWorkloads();
      toast({
        title: "Success",
        description: `${data.assignmentsCount} substitutes have been assigned.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track teacher workloads
  const updateTeacherWorkloads = React.useCallback(() => {
    const workloads = new Map<number, TeacherWorkload>();

    // Count classes for each teacher on the current day
    schedule.forEach((s: any) => {
      const teacherId = s.teacherId;
      if (!workloads.has(teacherId)) {
        const teacher = teachers.find((t: any) => t.id === teacherId);
        workloads.set(teacherId, {
          teacherId,
          name: teacher?.name || 'Unknown Teacher',
          classCount: 1,
          lastUpdated: today
        });
      } else {
        const current = workloads.get(teacherId)!;
        workloads.set(teacherId, {
          ...current,
          classCount: current.classCount + 1
        });
      }
    });

    // Store workloads in localStorage
    localStorage.setItem('teacherWorkloads', JSON.stringify(Array.from(workloads.values())));
  }, [schedule, teachers, today]);

  // Save to local storage
  React.useEffect(() => {
    if (assignments.length > 0) {
      localStorage.setItem('assignments', JSON.stringify({
        date: today,
        data: assignments
      }));
      updateTeacherWorkloads();
    }
  }, [assignments, today, updateTeacherWorkloads]);

  const exportReport = () => {
    // Get both current and stored assignments
    const storedData = localStorage.getItem('assignments');
    const storedAssignments = storedData ? JSON.parse(storedData) : { data: [] };
    const workloads = localStorage.getItem('teacherWorkloads');
    const teacherWorkloads = workloads ? JSON.parse(workloads) : [];

    const report = {
      currentDate: new Date().toLocaleDateString(),
      today: {
        date: today,
        assignments: assignments.map((assignment) => ({
          teacher: assignment.teacher.name,
          substitute: assignment.substitute?.name || 'Unassigned',
          classes: assignment.schedules.map(s => ({
            className: s.className,
            period: s.period
          }))
        }))
      },
      history: {
        date: storedAssignments.date,
        assignments: storedAssignments.data.map((assignment: Assignment) => ({
          teacher: assignment.teacher.name,
          substitute: assignment.substitute?.name || 'Unassigned',
          classes: assignment.schedules.map(s => ({
            className: s.className,
            period: s.period
          }))
        }))
      },
      teacherWorkloads: teacherWorkloads.sort((a: TeacherWorkload, b: TeacherWorkload) => 
        b.classCount - a.classCount
      )
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Process assignments to avoid duplicates
  const unassignedClasses = React.useMemo(() => {
    const classMap = new Map();

    assignments.forEach(assignment => {
      if (!assignment.substitute) {
        assignment.schedules.forEach(schedule => {
          const key = `${schedule.period}-${schedule.className}`;
          if (!classMap.has(key)) {
            classMap.set(key, {
              id: schedule.id,
              className: schedule.className,
              period: schedule.period,
              teacherName: assignment.teacher.name
            });
          }
        });
      }
    });

    return Array.from(classMap.values()).sort((a, b) => a.period - b.period);
  }, [assignments]);

  const assignedClasses = React.useMemo(() => {
    const classMap = new Map();

    assignments.forEach(assignment => {
      if (assignment.substitute) {
        assignment.schedules.forEach(schedule => {
          const key = `${schedule.period}-${schedule.className}`;
          if (!classMap.has(key)) {
            classMap.set(key, {
              id: schedule.id,
              className: schedule.className,
              period: schedule.period,
              teacherName: assignment.teacher.name,
              substituteName: assignment.substitute?.name
            });
          }
        });
      }
    });

    return Array.from(classMap.values()).sort((a, b) => a.period - b.period);
  }, [assignments]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Manage Absences</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => autoAssignMutation.mutate()}
            disabled={autoAssignMutation.isPending}
            variant="secondary"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Assign Substitutes
          </Button>
          <Button onClick={exportReport} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button 
            onClick={() => resetMutation.mutate()} 
            variant="destructive"
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unassignedClasses.map((classInfo) => (
              <Link 
                key={`${classInfo.period}-${classInfo.className}`}
                href={`/assign-substitute/${classInfo.id}`}
              >
                <div className="p-4 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors bg-destructive/5">
                  <div className="font-semibold text-lg text-primary">{classInfo.className}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                      Period {classInfo.period}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Teacher: {classInfo.teacherName}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {unassignedClasses.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-muted/10 rounded-lg">
                No classes need substitutes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Assigned Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedClasses.map((classInfo) => (
              <div 
                key={`${classInfo.period}-${classInfo.className}`}
                className="p-4 border rounded-lg bg-success/5"
              >
                <div className="font-semibold text-lg text-primary">{classInfo.className}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                    Period {classInfo.period}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Teacher: {classInfo.teacherName}
                  </span>
                </div>
                <div className="text-sm font-medium text-success mt-2 flex items-center">
                  <span className="mr-2">✓</span>
                  Substitute: {classInfo.substituteName}
                </div>
              </div>
            ))}
            {assignedClasses.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-muted/10 rounded-lg">
                No substitutes assigned yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}