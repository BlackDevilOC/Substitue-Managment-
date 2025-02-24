import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: currentSchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule", today],
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

  // Get available substitute teachers
  const substituteTeachers = teachers?.filter(t => t.isSubstitute && !absences?.some(
    a => (a.teacherId === t.id || a.substituteId === t.id) && 
    format(new Date(a.date), "yyyy-MM-dd") === today
  )) || [];

  // Get classes with absent teachers
  const absentTeacherClasses = currentSchedule?.filter(schedule => {
    const teacher = teachers?.find(t => t.id === schedule.teacherId);
    const isAbsent = absences?.some(
      a => a.teacherId === teacher?.id && 
      format(new Date(a.date), "yyyy-MM-dd") === today
    );
    return isAbsent;
  }) || [];

  const handleAssignSubstitute = (absenceId: number, substituteId: number) => {
    assignSubstituteMutation.mutate({ absenceId, substituteId });
  };

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
        {absentTeacherClasses.map(schedule => {
          const teacher = teachers?.find(t => t.id === schedule.teacherId);
          const absence = absences?.find(
            a => a.teacherId === teacher?.id && 
            format(new Date(a.date), "yyyy-MM-dd") === today
          );
          const substitute = teachers?.find(t => t.id === absence?.substituteId);

          return (
            <Card key={`${schedule.className}-${schedule.period}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-medium">
                      Class {schedule.className.toUpperCase()} - Period {schedule.period}
                    </h3>
                    <div className="flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Teacher Absent: {teacher?.name}
                    </div>
                    {substitute && (
                      <div className="text-sm text-yellow-600">
                        Substitute Assigned: {substitute.name}
                      </div>
                    )}
                  </div>

                  {!substitute && (
                    <div className="w-full sm:w-auto">
                      <Select 
                        onValueChange={(value) => handleAssignSubstitute(absence!.id, parseInt(value))}
                        disabled={assignSubstituteMutation.isPending}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Assign substitute" />
                        </SelectTrigger>
                        <SelectContent>
                          {substituteTeachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id.toString()}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {absentTeacherClasses.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No classes with absent teachers today
          </div>
        )}
      </div>
    </div>
  );
}
