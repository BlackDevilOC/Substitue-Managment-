import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCcw, School } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

interface SubstituteAssignment {
  originalTeacher: string;
  period: number;
  className: string;
  substitute: string;
  substitutePhone: string;
}

interface AssignmentsResponse {
  assignments: SubstituteAssignment[];
  warnings: string[];
}

export default function AssignedSubstitutesPage() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedAssignmentTeacher, setSelectedAssignmentTeacher] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch substitute assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/substitute-assignments"],
  });

  // Handle refresh function
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      toast({
        title: "Data Refreshed",
        description: "The assignments list has been updated.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAssignmentTeacherClick = (teacherName: string) => {
    if (selectedAssignmentTeacher === teacherName) {
      setSelectedAssignmentTeacher(null);
    } else {
      setSelectedAssignmentTeacher(teacherName);
    }
  };

  // Group assignments by original teacher
  const groupedAssignments = assignmentsData?.assignments.reduce((acc, curr) => {
    if (!acc[curr.originalTeacher]) {
      acc[curr.originalTeacher] = [];
    }
    acc[curr.originalTeacher].push(curr);
    return acc;
  }, {} as Record<string, SubstituteAssignment[]>) || {};

  if (isLoadingAssignments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="w-full mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="w-10"></div>
          <h1 className="text-3xl font-bold text-primary">Assigned Substitutes</h1>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={isRefreshing}
            title="Refresh Data"
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Assigned Teachers Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            Substitute Assignments - {format(new Date(today), 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedAssignments).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <School className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assignments</h3>
              <p className="text-muted-foreground mt-2">
                No substitute teachers have been assigned yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAssignments).map(([teacherName, assignments]) => (
                <div key={teacherName} className="relative p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleAssignmentTeacherClick(teacherName)}
                  >
                    <div>
                      <h3 className="font-medium text-primary">{teacherName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignments.length} {assignments.length === 1 ? 'period' : 'periods'} assigned
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      {selectedAssignmentTeacher === teacherName ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>

                  {selectedAssignmentTeacher === teacherName && (
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary/20">
                      {assignments.map((assignment, idx) => (
                        <div key={idx} className="bg-muted/30 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">
                                Period {assignment.period} - Class {assignment.className}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Substitute: {assignment.substitute}
                              </p>
                              {assignment.substitutePhone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  📱 {assignment.substitutePhone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
