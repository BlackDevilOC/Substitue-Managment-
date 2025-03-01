
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";

export default function TestAutoAssignPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Query to fetch current teachers for marking absences
  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  // Query to fetch assignments after auto-assign
  const { data: assignments, refetch: refetchAssignments } = useQuery({
    queryKey: ["/api/substitute-assignments"],
  });

  // Mark a teacher as absent for testing
  const markAbsentMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          date: today,
          status: "absent"
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to mark teacher as absent");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher marked as absent for today",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Auto-assign substitutes mutation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
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
      setResults(data);
      refetchAssignments();
      toast({
        title: "Success",
        description: `${data.assignmentsCount} substitutes have been assigned.`,
      });
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  // Handle marking a random teacher as absent for testing
  const markRandomTeacherAbsent = () => {
    if (!teachers || teachers.length === 0) {
      toast({
        title: "Error",
        description: "No teachers available to mark as absent",
        variant: "destructive",
      });
      return;
    }

    // Filter non-substitute teachers
    const regularTeachers = teachers.filter((t: any) => !t.isSubstitute);
    
    if (regularTeachers.length === 0) {
      toast({
        title: "Error",
        description: "No regular teachers available to mark as absent",
        variant: "destructive",
      });
      return;
    }
    
    // Select a random teacher
    const randomIndex = Math.floor(Math.random() * regularTeachers.length);
    const randomTeacher = regularTeachers[randomIndex];
    
    markAbsentMutation.mutate(randomTeacher.id);
  };

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Auto-Assign Algorithm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4">
            <Button onClick={markRandomTeacherAbsent} disabled={!teachers}>
              Mark Random Teacher Absent
            </Button>
            
            <Button 
              onClick={() => autoAssignMutation.mutate()} 
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? "Assigning..." : "Run Auto-Assign Algorithm"}
            </Button>
          </div>

          {results && (
            <div className="mt-4">
              <h3 className="text-lg font-medium">Results:</h3>
              <pre className="bg-muted p-4 rounded-md mt-2 overflow-auto max-h-[300px] text-sm">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          {assignments && assignments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium">Current Assignments:</h3>
              <div className="bg-muted p-4 rounded-md mt-2 overflow-auto max-h-[300px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Class</th>
                      <th className="text-left py-2">Period</th>
                      <th className="text-left py-2">Original Teacher</th>
                      <th className="text-left py-2">Substitute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment: any) => (
                      <tr key={`${assignment.className}-${assignment.period}`} className="border-b">
                        <td className="py-2">{assignment.className}</td>
                        <td className="py-2">{assignment.period}</td>
                        <td className="py-2">{assignment.originalTeacher}</td>
                        <td className="py-2">{assignment.substitute}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
