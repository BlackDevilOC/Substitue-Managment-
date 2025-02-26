import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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

  const exportReport = () => {
    const report = {
      date: new Date().toLocaleDateString(),
      assignments: assignments.map((assignment: any) => ({
        teacher: assignment.teacher.name,
        substitute: assignment.substitute?.name || 'Unassigned',
        classes: assignment.schedules.map((s: any) => ({
          className: s.className,
          period: s.period
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter unique schedules to avoid duplicates
  const unassignedClasses = React.useMemo(() => {
    if (!Array.isArray(assignments)) return [];

    return assignments
      .filter((assignment: any) => !assignment.substitute)
      .reduce((acc: any[], { teacher, schedules }: any) => {
        const classEntries = schedules.map((schedule: any) => ({
          id: schedule.id,
          className: schedule.className,
          period: schedule.period,
          teacherName: teacher.name
        }));
        return [...acc, ...classEntries];
      }, [])
      .sort((a: any, b: any) => a.period - b.period);
  }, [assignments]);

  const assignedClasses = React.useMemo(() => {
    if (!Array.isArray(assignments)) return [];

    return assignments
      .filter((assignment: any) => assignment.substitute)
      .reduce((acc: any[], { teacher, substitute, schedules }: any) => {
        const classEntries = schedules.map((schedule: any) => ({
          id: schedule.id,
          className: schedule.className,
          period: schedule.period,
          teacherName: teacher.name,
          substituteName: substitute?.name
        }));
        return [...acc, ...classEntries];
      }, [])
      .sort((a: any, b: any) => a.period - b.period);
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
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unassignedClasses.map((classInfo) => (
              <Link 
                key={classInfo.id}
                href={`/assign-substitute/${classInfo.id}`}
              >
                <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors">
                  <div className="font-medium">{classInfo.className}</div>
                  <div className="text-sm text-muted-foreground">
                    Period {classInfo.period} - {classInfo.teacherName}
                  </div>
                </div>
              </Link>
            ))}
            {unassignedClasses.length === 0 && (
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
            {assignedClasses.map((classInfo) => (
              <div 
                key={classInfo.id}
                className="p-3 border rounded-lg"
              >
                <div className="font-medium">{classInfo.className}</div>
                <div className="text-sm text-muted-foreground">
                  Period {classInfo.period} - {classInfo.teacherName}
                </div>
                <div className="text-sm font-medium text-primary mt-1">
                  Substitute: {classInfo.substituteName}
                </div>
              </div>
            ))}
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