import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarX, RefreshCcw, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
//import TeacherTimetable from "@/components/ui/teacher-timetable"; // Removed as per the intention

interface AbsentTeacher {
  name: string;
  phoneNumber: string;
  timestamp: string;
}

interface Assignment {
  originalTeacher: string;
  period: number;
  className: string;
  substitute: string;
  substitutePhone: string;
}

interface AssignmentData {
  assignments: Assignment[];
  warnings: string[];
}

// Mock data for assignments - will be replaced with actual API data later
const mockAssignments: AssignmentData = {
  assignments: [
    {
      originalTeacher: "Sir Bakir Shah",
      period: 1,
      className: "10A",
      substitute: "Sir Waqar Ali",
      substitutePhone: "+923113588606"
    },
    {
      originalTeacher: "Sir Bakir Shah",
      period: 2,
      className: "9B",
      substitute: "Sir Fahad Malik",
      substitutePhone: "+923156103995"
    },
    {
      originalTeacher: "Sir Ahmed Khan",
      period: 3,
      className: "8A",
      substitute: "Sir Waqar Ali",
      substitutePhone: "+923113588606"
    }
  ],
  warnings: []
};

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch absent teachers
  const { data: absentTeachers = [], isLoading, refetch: refetchAbsentTeachers } = useQuery<AbsentTeacher[]>({
    queryKey: ["/api/get-absent-teachers"],
  });

  // Fetch assigned teachers (mock data for now)
  const { data: assignedTeachers = mockAssignments, isLoading: isLoadingAssignments } = useQuery<AssignmentData>({
    queryKey: ["/api/assigned-teachers"],
    initialData: mockAssignments,
  });

  // Group assignments by original teacher
  const groupedAssignments = React.useMemo(() => {
    const groups: { [key: string]: Assignment[] } = {};
    assignedTeachers.assignments.forEach(assignment => {
      if (!groups[assignment.originalTeacher]) {
        groups[assignment.originalTeacher] = [];
      }
      groups[assignment.originalTeacher].push(assignment);
    });
    return groups;
  }, [assignedTeachers.assignments]);

  // Handle refresh function
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetchAbsentTeachers();
      toast({
        title: "Data Refreshed",
        description: "The absent teachers list has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const handleTeacherClick = (teacherName: string) => {
    if (selectedTeacher === teacherName) {
      setSelectedTeacher(null);
    } else {
      setSelectedTeacher(teacherName);
    }
  };

  const toggleAssignment = (teacherName: string) => {
    if (expandedAssignment === teacherName) {
      setExpandedAssignment(null);
    } else {
      setExpandedAssignment(teacherName);
    }
  };

  if (isLoading || isLoadingAssignments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="w-full mb-8">
        {/* Top section with title and refresh button */}
        <div className="flex justify-between items-center mb-4">
          <div className="w-10"></div>
          <h1 className="text-3xl font-bold">Manage Absences</h1>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={isRefreshing || isLoading}
            title="Refresh Data"
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Reset button below top section, aligned to right */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => resetMutation.mutate()}
            variant="outline"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset Assignments
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Absent Teachers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Absent Teachers - {format(new Date(today), 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {absentTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No absent teachers</h3>
              <p className="text-muted-foreground mt-2">
                All teachers are present today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {absentTeachers.map((teacher, index) => (
                <div key={index} className="relative p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleTeacherClick(teacher.name)}
                  >
                    <div>
                      <h3 className="font-medium">{teacher.name}</h3>
                      {teacher.phoneNumber && (
                        <p className="text-sm text-muted-foreground">
                          📱 {teacher.phoneNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(teacher.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Removed TeacherTimetable component */}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Teachers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Substitutes - {format(new Date(today), 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedAssignments).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assignments made</h3>
              <p className="text-muted-foreground mt-2">
                No substitute teachers have been assigned yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAssignments).map(([teacher, assignments]) => (
                <div key={teacher} className="border rounded-lg overflow-hidden">
                  <div 
                    className="p-4 bg-accent/5 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleAssignment(teacher)}
                  >
                    <h3 className="font-medium">{teacher}</h3>
                    {expandedAssignment === teacher ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {expandedAssignment === teacher && (
                    <div className="p-4 space-y-3 bg-muted/5">
                      {assignments.map((assignment, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-primary/20">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">
                                Period {assignment.period} - Class {assignment.className}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Substitute: {assignment.substitute}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              📱 {assignment.substitutePhone}
                            </p>
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