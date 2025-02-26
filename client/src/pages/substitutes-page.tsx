import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TeacherStatus {
  teacherId: number;
  status: 'available' | 'assigned' | 'absent';
  assignedTo?: string;
  className?: string;
}

export default function SubstitutesPage() {
  const { user } = useAuth();
  const [teacherStatuses, setTeacherStatuses] = useState<TeacherStatus[]>([]);

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const res = await fetch("/api/teachers");
      return res.json();
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["substitute-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/substitute-assignments");
      return res.json();
    },
  });

  const { data: absences } = useQuery({
    queryKey: ["absences"],
    queryFn: async () => {
      const res = await fetch("/api/absences");
      return res.json();
    },
  });

  useEffect(() => {
    // Load statuses from localStorage
    const savedStatuses = localStorage.getItem('teacherStatuses');
    if (savedStatuses) {
      setTeacherStatuses(JSON.parse(savedStatuses));
    }
  }, []);

  useEffect(() => {
    if (teachers && assignments && absences) {
      const newStatuses: TeacherStatus[] = teachers.map((teacher: any) => {
        const assignment = assignments.find((a: any) =>
          a.substitute?.id === teacher.id || a.absence.teacherId === teacher.id
        );

        const isAbsent = absences.some((a: any) => a.teacherId === teacher.id);

        let status: TeacherStatus = {
          teacherId: teacher.id,
          status: 'available'
        };

        if (isAbsent) {
          status.status = 'absent';
        } else if (assignment) {
          const absentTeacher = teachers.find((t: any) => t.id === assignment.absence?.teacherId);
          status.status = 'assigned';
          status.assignedTo = absentTeacher?.name || 'Unknown Teacher';
          status.className = assignment.className;
        }

        return status;
      });

      setTeacherStatuses(newStatuses);
      localStorage.setItem('teacherStatuses', JSON.stringify(newStatuses));
    }
  }, [teachers, assignments, absences]);

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Substitute Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teachers?.map((teacher: any) => {
              const status = teacherStatuses.find(s => s.teacherId === teacher.id);
              const assignment = assignments.find((a: any) => a.substitute?.id === teacher.id || a.absence.teacherId === teacher.id);

              return (
                <div key={teacher.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {status?.status === 'assigned' && (
                        <div className="text-sm text-muted-foreground">
                          Covering for: {status.assignedTo} in Class {status.className}
                          {assignment?.absence?.period && (
                            <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                              Period {assignment.absence.period}
                              {assignment.periodTiming && ` (${assignment.periodTiming.startTime}-${assignment.periodTiming.endTime})`}
                            </span>
                          )}
                        </div>
                      )}
                      {status?.status === 'absent' && (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive rounded-full text-xs">
                          Absent
                        </span>
                      )}
                      {status?.status === 'available' && (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}