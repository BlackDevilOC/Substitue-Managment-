
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface ClassAssignment {
  period: number;
  className: string;
  teacherId: number;
  substituteId?: number;
}

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [localAssignments, setLocalAssignments] = useState<Record<string, ClassAssignment[]>>({});

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  useEffect(() => {
    const stored = localStorage.getItem('substituteAssignments');
    if (stored) {
      setLocalAssignments(JSON.parse(stored));
    }
  }, []);

  const saveAssignment = (absenceId: number, classInfo: ClassAssignment, substituteId: number) => {
    const key = `${today}-${absenceId}`;
    const assignments = { 
      ...localAssignments,
      [key]: [...(localAssignments[key] || []), { ...classInfo, substituteId }]
    };
    setLocalAssignments(assignments);
    localStorage.setItem('substituteAssignments', JSON.stringify(assignments));
  };

  const isLoading = loadingSchedule || loadingTeachers || loadingAbsences;
  const availableSubstitutes = teachers?.filter(t => t.isSubstitute) || [];

  // Get absent teachers and their classes
  const absentTeachers = absences?.filter(
    a => format(new Date(a.date), "yyyy-MM-dd") === today
  ).map(absence => {
    const teacher = teachers?.find(t => t.id === absence.teacherId);
    const teacherClasses = schedule?.filter(s => s.teacherId === absence.teacherId) || [];
    const key = `${today}-${absence.id}`;
    const assignedClasses = localAssignments[key] || [];

    return {
      absence,
      teacher,
      classes: teacherClasses.map(c => ({
        ...c,
        assigned: assignedClasses.find(a => 
          a.period === c.period && a.className === c.className
        )?.substituteId
      }))
    };
  }) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Manage Absences</h1>

      {/* Assigned Substitutes */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Substitutes</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(localAssignments).map(([key, assignments]) => (
            <div key={key} className="mb-4">
              {assignments.map((assignment, idx) => {
                const substitute = teachers?.find(t => t.id === assignment.substituteId);
                return (
                  <div key={idx} className="text-sm p-2 border-b">
                    <span className="font-semibold">{assignment.className}</span> - 
                    Period {assignment.period} - 
                    Substitute: {substitute?.name}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Unassigned Classes */}
      <div className="grid gap-4">
        {absentTeachers.map(({ absence, teacher, classes }) => (
          <Card key={absence.id}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{teacher?.name}</h3>
              <div className="grid gap-4">
                {classes.map((c) => !c.assigned && (
                  <div key={`${c.period}-${c.className}`} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{c.className.toUpperCase()}</span>
                      <span className="text-sm text-muted-foreground ml-2">Period {c.period}</span>
                    </div>
                    <Select
                      onValueChange={(value) => {
                        saveAssignment(absence.id, c, parseInt(value));
                        toast({
                          title: "Success",
                          description: "Substitute assigned successfully",
                        });
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Assign substitute" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubstitutes.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {absentTeachers.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No absent teachers today
          </div>
        )}
      </div>
    </div>
  );
}
