
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileDown } from "lucide-react";

export default function ManageAbsencesPage() {
  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: schedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const availableSubstitutes = teachers?.filter(t => t.isSubstitute) || [];

  const saveAssignment = async (absenceId: number, classInfo: any, substituteId: number) => {
    const res = await fetch(`/api/absences/${absenceId}/substitute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ substituteId }),
    });
    if (!res.ok) throw new Error("Failed to assign substitute");
  };

  const exportReport = () => {
    const report = {
      date: new Date().toLocaleDateString(),
      absentTeachers: absentTeachers.map(({ teacher, classes }) => ({
        name: teacher?.name,
        classes: classes.map(c => ({
          className: c.className,
          period: c.period,
          substitute: c.assigned ? teachers?.find(t => t.id === c.assigned)?.name : 'Unassigned'
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${report.date}.json`;
    a.click();
  };

  const absentTeachers = absences?.map(absence => {
    const teacher = teachers?.find(t => t.id === absence.teacherId);
    const classes = schedule?.filter(s => s.teacherId === absence.teacherId)
      .map(s => ({
        period: s.period,
        className: s.className,
        assigned: s.substituteId
      })) || [];
    return { absence, teacher, classes };
  }) || [];

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
        {/* Unassigned Classes Box */}
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {absentTeachers.map(({ absence, teacher, classes }) => (
              <div key={absence.id} className="space-y-2">
                {classes.filter(c => !c.assigned).map((c) => (
                  <div key={`${c.period}-${c.className}`} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{teacher?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Class {c.className} - Period {c.period}
                      </div>
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
            ))}
            {!absentTeachers.some(({ classes }) => classes.some(c => !c.assigned)) && (
              <div className="text-center text-muted-foreground py-4">
                No classes need substitutes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Classes Box */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {absentTeachers.map(({ teacher, classes }) => (
              <div key={teacher?.id} className="space-y-2">
                {classes.filter(c => c.assigned).map((c) => {
                  const substitute = teachers?.find(t => t.id === c.assigned);
                  return (
                    <div key={`${c.period}-${c.className}`} className="p-2 border rounded">
                      <div className="font-medium">{teacher?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Class {c.className} - Period {c.period}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-1">
                        Substitute: {substitute?.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {!absentTeachers.some(({ classes }) => classes.some(c => c.assigned)) && (
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
