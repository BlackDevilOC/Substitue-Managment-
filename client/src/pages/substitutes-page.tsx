
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserCheck, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json();
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/substitute-assignments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/substitute-assignments");
      return res.json();
    },
    enabled: !!user, // Only run query if user is authenticated
  });

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ["/api/absences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/absences");
      return res.json();
    },
    enabled: !!user, // Only run query if user is authenticated
  });

  // Load statuses from localStorage on component mount
  useEffect(() => {
    const savedStatuses = localStorage.getItem('teacherStatuses');
    if (savedStatuses) {
      setTeacherStatuses(JSON.parse(savedStatuses));
    }
  }, []);

  // Update statuses when data changes
  useEffect(() => {
    if (teachers && assignments && absences) {
      const newStatuses: TeacherStatus[] = teachers.map((teacher: any) => {
        const assignment = assignments.find((a: any) =>
          a.substitute?.id === teacher.id || a.absence?.teacherId === teacher.id
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

  // Show loading state
  if (teachersLoading || assignmentsLoading || absencesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Handle the case when API calls fail but we have local data
  const displayTeachers = teachers || [];

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
            {displayTeachers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No teacher data available
              </div>
            )}
            
            {displayTeachers.map((teacher: any) => {
              const status = teacherStatuses.find(s => s.teacherId === teacher.id);

              return (
                <div key={teacher.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {status?.status === 'assigned' && (
                        <div className="text-sm text-muted-foreground">
                          Covering for: {status.assignedTo} in Class {status.className}
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
