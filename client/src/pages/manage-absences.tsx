import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManageAbsencesPage() {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const assignSubstituteMutation = useMutation({
    mutationFn: async ({ absenceId, substituteId }: { absenceId: number; substituteId: number }) => {
      const res = await fetch(`/api/absences/${absenceId}/substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substituteId }),
      });
      if (!res.ok) throw new Error("Failed to assign substitute");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      toast({
        title: "Success",
        description: "Substitute teacher assigned successfully",
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

  const isLoading = loadingSchedule || loadingTeachers || loadingAbsences;

  // Get available substitute teachers (not absent and not already assigned)
  const availableSubstitutes = teachers?.filter(t => {
    const isAbsentToday = absences?.some(
      a => a.teacherId === t.id && 
      format(new Date(a.date), "yyyy-MM-dd") === today
    );
    const isAssignedToday = absences?.some(
      a => a.substituteId === t.id && 
      format(new Date(a.date), "yyyy-MM-dd") === today
    );
    return !isAbsentToday && !isAssignedToday;
  }) || [];

  // Get absent teachers and their classes
  const absentTeachers = absences?.filter(
    a => format(new Date(a.date), "yyyy-MM-dd") === today
  ).map(absence => {
    const teacher = teachers?.find(t => t.id === absence.teacherId);
    const substitute = teachers?.find(t => t.id === absence.substituteId);
    const teacherClasses = schedule?.filter(s => s.teacherId === absence.teacherId) || [];

    return {
      absence,
      teacher,
      substitute,
      classes: teacherClasses
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

      <div className="grid gap-4">
        {absentTeachers.map(({ absence, teacher, substitute, classes }) => (
          <Card key={absence.id}>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{teacher?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Classes: {classes.map(c => (
                        `${c.className.toUpperCase()} (Period ${c.period})`
                      )).join(", ")}
                    </p>
                  </div>

                  {substitute ? (
                    <div className="text-sm">
                      Substitute: <span className="font-semibold">{substitute.name}</span>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => 
                        assignSubstituteMutation.mutate({
                          absenceId: absence.id,
                          substituteId: parseInt(value)
                        })
                      }
                      disabled={assignSubstituteMutation.isPending}
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
                  )}
                </div>
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