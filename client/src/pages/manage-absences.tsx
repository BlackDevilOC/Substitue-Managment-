import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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

export default function ManageAbsencesPage() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: absences = [] } = useQuery<Absence[]>({
    queryKey: ["/api/absences"],
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: schedule = [] } = useQuery<ScheduleClass[]>({
    queryKey: ["/api/schedule"],
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Absences</h1>
        <Button onClick={exportReport} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {classesNeedingSubstitutes.map((classInfo) => {
              const teacher = teachers.find(t => t.id === classInfo.teacherId);
              return (
                <Link 
                  key={`${classInfo.period}-${classInfo.className}`}
                  href={`/assign-substitute/${classInfo.id}`}
                >
                  <div className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="font-medium">{classInfo.className}</div>
                    <div className="text-sm text-muted-foreground">
                      Period {classInfo.period} - {teacher?.name}
                    </div>
                  </div>
                </Link>
              );
            })}
            {classesNeedingSubstitutes.length === 0 && (
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
            {assignedClasses.map((classInfo) => {
              const teacher = teachers.find(t => t.id === classInfo.teacherId);
              const substitute = teachers.find(t => t.id === classInfo.substituteId);
              return (
                <div key={`${classInfo.period}-${classInfo.className}`} className="p-3 border rounded-lg">
                  <div className="font-medium">{classInfo.className}</div>
                  <div className="text-sm text-muted-foreground">
                    Period {classInfo.period} - {teacher?.name}
                  </div>
                  <div className="text-sm font-medium text-green-600 mt-1">
                    Substitute: {substitute?.name}
                  </div>
                </div>
              );
            })}
            {assignedClasses.length === 0 && (
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