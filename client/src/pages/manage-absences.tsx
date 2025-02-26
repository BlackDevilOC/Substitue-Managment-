import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ManageAbsencesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: absences = [] } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/substitute-assignments"],
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

  // Local storage functions
  const getLocalStorageData = (): LocalStorageData => {
    const stored = localStorage.getItem('teacherAbsenceData');
    return stored ? JSON.parse(stored) : { absences: [], substitutes: [] };
  };

  const setLocalStorageData = (data: LocalStorageData) => {
    localStorage.setItem('teacherAbsenceData', JSON.stringify(data));
  };

  // Get current data from local storage
  const localData = React.useMemo(() => {
    return getLocalStorageData();
  }, []);

  // Sync local data with server data
  React.useEffect(() => {
    if (absences.length > 0) {
      const localData = getLocalStorageData();
      setLocalStorageData({
        ...localData,
        absences: absences
      });
    }
  }, [absences]);

  const exportReport = () => {
    const localData = getLocalStorageData();
    const report = {
      date: new Date().toLocaleDateString(),
      absentTeachers: absences.map(absence => {
        const teacher = teachers.find(t => t.id === absence.teacherId);
        const classesForTeacher = schedule.filter(s => s.teacherId === absence.teacherId);
        const classes = classesForTeacher.map(s => {
          const substituteAssignment = localData.substitutes.find(
            sub => sub.classId === s.id && sub.date === today
          );
          const substitute = substituteAssignment 
            ? teachers.find(t => t.id === substituteAssignment.substituteId)
            : undefined;

          return {
            className: s.className,
            period: s.period,
            substitute: substitute?.name || 'Unassigned'
          };
        });
        return { 
          teacher: teacher?.name, 
          date: absence.date,
          classes 
        };
      })
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const classesNeedingSubstitutes = React.useMemo(() => {
    const absentTeacherIds = absences
      .filter(a => a.date === today)
      .map(a => a.teacherId);

    return schedule.filter(s => {
      const isTeacherAbsent = absentTeacherIds.includes(s.teacherId);
      const hasSubstitute = localData.substitutes.some(
        sub => sub.classId === s.id && sub.date === today
      );
      return isTeacherAbsent && !hasSubstitute;
    });
  }, [schedule, absences, localData.substitutes, today]);

  const assignedClasses = React.useMemo(() => {
    const absentTeacherIds = absences
      .filter(a => a.date === today)
      .map(a => a.teacherId);

    return schedule.filter(s => {
      const isTeacherAbsent = absentTeacherIds.includes(s.teacherId);
      const hasSubstitute = localData.substitutes.some(
        sub => sub.classId === s.id && sub.date === today
      );
      return isTeacherAbsent && hasSubstitute;
    }).map(s => {
      const substituteAssignment = localData.substitutes.find(
        sub => sub.classId === s.id && sub.date === today
      );
      return {
        ...s,
        substituteId: substituteAssignment?.substituteId
      };
    });
  }, [schedule, absences, localData.substitutes, today]);

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
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments
              .filter(({ substitute }) => !substitute)
              .map(({ teacher, schedules }) => (
                schedules.map((classInfo) => (
                  <Link 
                    key={classInfo.id}
                    href={`/assign-substitute/${classInfo.id}`}
                  >
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors">
                      <div className="font-medium">{classInfo.className}</div>
                      <div className="text-sm text-muted-foreground">
                        Period {classInfo.period} - {teacher.name}
                      </div>
                    </div>
                  </Link>
                ))
              ))
            }
            {assignments.filter(({ substitute }) => !substitute).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No classes need substitutes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments
              .filter(({ substitute }) => substitute)
              .map(({ teacher, substitute, schedules }) => (
                schedules.map((classInfo) => (
                  <div 
                    key={classInfo.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="font-medium">{classInfo.className}</div>
                    <div className="text-sm text-muted-foreground">
                      Period {classInfo.period} - {teacher.name}
                    </div>
                    <div className="text-sm font-medium text-primary mt-1">
                      Substitute: {substitute?.name}
                    </div>
                  </div>
                ))
              ))
            }
            {assignments.filter(({ substitute }) => substitute).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No substitutes assigned yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface Teacher {
  id: string;
  name: string;
}

interface Absence {
  id: number;
  teacherId: string;
  date: string;
  substituteId?: string;
}

interface ScheduleClass {
  id: string;
  teacherId: string;
  className: string;
  period: number;
  substituteId?: string;
}

interface LocalStorageData {
  absences: Absence[];
  substitutes: {
    classId: string;
    substituteId: string;
    date: string;
  }[];
}