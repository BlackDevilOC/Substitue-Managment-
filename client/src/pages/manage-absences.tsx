import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface AbsentTeacher {
  name: string;
  phoneNumber: string;
  timestamp: string;
}

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch absent teachers
  const { data: absentTeachers = [], isLoading } = useQuery<AbsentTeacher[]>({
    queryKey: ["/api/get-absent-teachers"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('assignments');
      localStorage.removeItem('teacherWorkloads');
      return await fetch("/api/reset-assignments", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      toast({
        title: "Reset Complete",
        description: "All assignments have been cleared.",
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

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Teachers Needing Substitutes</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => autoAssignMutation.mutate()}
            disabled={autoAssignMutation.isPending}
            variant="secondary"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Assign Substitutes
          </Button>
          <Button 
            onClick={() => resetMutation.mutate()} 
            variant="destructive"
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Teachers Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {absentTeachers.map((teacher) => (
              <div 
                key={teacher.name}
                className="p-4 border rounded-lg hover:bg-accent/5 transition-colors bg-destructive/5"
              >
                <div className="font-semibold text-lg text-primary">{teacher.name}</div>
                {teacher.phoneNumber && (
                  <div className="text-sm text-muted-foreground mt-1">
                    📱 {teacher.phoneNumber}
                  </div>
                )}
              </div>
            ))}
            {absentTeachers.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-muted/10 rounded-lg">
                No absent teachers at the moment
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Assigned Substitutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8 bg-muted/10 rounded-lg">
              Substitute assignment feature coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}