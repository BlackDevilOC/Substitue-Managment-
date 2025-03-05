import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCcw, School, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
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

      // Just fetch the substitute assignments without auto-assigning
      await queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });

      toast({
        title: "Data Refreshed",
        description: "Substitute assignments have been refreshed.",
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
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
          <School className="h-8 w-8" />
          Assigned Substitutes
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(today), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setLocation('/manage-absences')}
          variant="ghost"
          size="sm"
          className="h-9"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Absences
        </Button>

        <Button 
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="h-9"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      {/* Assignments Card */}
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/50 space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <School className="h-5 w-5 text-primary" />
            Today's Substitute Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {Object.keys(groupedAssignments).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-lg">
              <School className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No Assignments Yet</h3>
              <p className="text-muted-foreground max-w-sm">
                There are currently no substitute assignments. Check back later for updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAssignments).map(([teacherName, assignments]) => (
                <div 
                  key={teacherName} 
                  className="relative p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200 group"
                >
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleAssignmentTeacherClick(teacherName)}
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium group-hover:text-primary transition-colors">
                        {teacherName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assignments.length} {assignments.length === 1 ? 'period' : 'periods'} assigned
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {selectedAssignmentTeacher === teacherName ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>

                  {selectedAssignmentTeacher === teacherName && (
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary/20">
                      {assignments.map((assignment, idx) => (
                        <div 
                          key={idx} 
                          className="bg-muted/30 p-4 rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-primary">
                                Period {assignment.period}
                              </p>
                              <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                Class {assignment.className}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">Substitute:</span>{" "}
                                <span className="font-medium">{assignment.substitute}</span>
                              </p>
                              {assignment.substitutePhone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="text-primary">📱</span>
                                  {assignment.substitutePhone}
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

          {/* Display Warnings */}
          {assignmentsData?.warnings && assignmentsData.warnings.length > 0 && (
            <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-400 rounded">
              <h4 className="font-medium text-orange-800 mb-2">Attention Required</h4>
              <ul className="space-y-1">
                {assignmentsData.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-orange-700">
                    ⚠️ {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}