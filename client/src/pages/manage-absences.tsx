import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarX, RefreshCcw } from "lucide-react";
import TeacherTimetable from "@/components/ui/teacher-timetable";

interface AbsentTeacher {
  name: string;
  phoneNumber: string;
  timestamp: string;
}

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

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedAssignmentTeacher, setSelectedAssignmentTeacher] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch absent teachers
  const { data: absentTeachers = [], isLoading: isLoadingAbsent, refetch: refetchAbsentTeachers } = useQuery<AbsentTeacher[]>({
    queryKey: ["/api/get-absent-teachers"],
  });

  // Fetch substitute assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/substitute-assignments"],
  });

  // Handle refresh function
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetchAbsentTeachers();
      await queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      toast({
        title: "Data Refreshed",
        description: "The absent teachers and assignments list has been updated.",
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
        variant: "destructive"
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

  if (isLoadingAbsent || isLoadingAssignments) {
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
            disabled={isRefreshing || isLoadingAbsent}
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

                  {selectedTeacher === teacher.name && (
                    <TeacherTimetable 
                      teacherName={teacher.name}
                      isOpen={selectedTeacher === teacher.name}
                      onClose={() => setSelectedTeacher(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Teachers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Teachers - {format(new Date(today), 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedAssignments).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assignments</h3>
              <p className="text-muted-foreground mt-2">
                No substitute teachers have been assigned yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAssignments).map(([teacherName, assignments]) => (
                <div key={teacherName} className="relative p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleAssignmentTeacherClick(teacherName)}
                  >
                    <div>
                      <h3 className="font-medium">{teacherName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignments.length} periods assigned
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      🔄 Assignments
                    </div>
                  </div>

                  {selectedAssignmentTeacher === teacherName && (
                    <div className="mt-4 space-y-2 pl-4 border-l-2 border-gray-200">
                      {assignments.map((assignment, idx) => (
                        <div key={idx} className="text-sm">
                          <p>Period {assignment.period} - Class {assignment.className}</p>
                          <p className="text-muted-foreground">
                            Substitute: {assignment.substitute}
                            {assignment.substitutePhone && (
                              <span className="ml-2">📱 {assignment.substitutePhone}</span>
                            )}
                          </p>
                        </div>
                      ))}
                      {assignmentsData?.warnings?.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                          {assignmentsData.warnings.map((warning, idx) => (
                            <p key={idx}>⚠️ {warning}</p>
                          ))}
                        </div>
                      )}
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