
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Link } from "wouter";

export default function ManageAbsencesPage() {
  const { data: absences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: schedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const exportReport = () => {
    const report = {
      date: new Date().toLocaleDateString(),
      absentTeachers: absences?.map(absence => {
        const teacher = teachers?.find(t => t.id === absence.teacherId);
        const classes = schedule?.filter(s => s.teacherId === absence.teacherId)
          .map(s => ({
            className: s.className,
            period: s.period,
            substitute: s.substituteId ? teachers?.find(t => t.id === s.substituteId)?.name : 'Unassigned'
          }));
        return { teacher: teacher?.name, classes };
      })
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${report.date}.json`;
    a.click();
  };

  const classesNeedingSubstitutes = schedule?.filter(s => {
    const teacher = teachers?.find(t => t.id === s.teacherId);
    return absences?.some(a => a.teacherId === s.teacherId) && !s.substituteId;
  }) || [];

  const assignedClasses = schedule?.filter(s => {
    const teacher = teachers?.find(t => t.id === s.teacherId);
    return absences?.some(a => a.teacherId === s.teacherId) && s.substituteId;
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
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {classesNeedingSubstitutes.map((classInfo) => {
              const teacher = teachers?.find(t => t.id === classInfo.teacherId);
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
              const teacher = teachers?.find(t => t.id === classInfo.teacherId);
              const substitute = teachers?.find(t => t.id === classInfo.substituteId);
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
