import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarX, RefreshCcw, Clock, UserCheck, ArrowRight } from "lucide-react";
import TeacherTimetable from "@/components/ui/teacher-timetable";

interface AbsentTeacher {
  name: string;
  phoneNumber: string;
  timestamp: string;
  assignedSubstitute: boolean; // Added assignedSubstitute property
}

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch absent teachers
  const { data: absentTeachers = [], isLoading: isLoadingAbsent, refetch: refetchAbsentTeachers } = useQuery<AbsentTeacher[]>({
    queryKey: ["/api/get-absent-teachers"],
  });

  // Handle refresh function
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetchAbsentTeachers();
      toast({
        title: "Data Refreshed",
        description: "The absent teachers list has been updated.",
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

  // Auto-assign substitutes mutation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/autoassign");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to auto-assign substitutes');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-assignments"] });
      toast({
        title: "Auto-Assignment Complete",
        description: `Successfully assigned ${data.assignmentsCount} substitutes.`,
      });
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Assignment Warnings",
          description: data.warnings.join('\n'),
          variant: "warning"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
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

  const filteredAbsentTeachers = useMemo(() => {
    return absentTeachers.filter(teacher => !teacher.assignedSubstitute);
  }, [absentTeachers]);


  if (isLoadingAbsent) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading absent teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
          <UserCheck className="h-8 w-8" />
          Manage Absences
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(today), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-end gap-3">
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

        <Button 
          onClick={() => autoAssignMutation.mutate()}
          variant="outline"
          size="sm"
          className="h-9"
          disabled={autoAssignMutation.isPending}
        >
          {autoAssignMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Assign Substitute
            </>
          )}
        </Button>
      </div>

      {/* Absent Teachers Section */}
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/50 space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="h-5 w-5 text-primary" />
            Absent Teachers Today
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredAbsentTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-lg">
              <CalendarX className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No Absences Reported</h3>
              <p className="text-muted-foreground max-w-sm">
                All teachers are present today. Check back later for any updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAbsentTeachers.map((teacher, index) => (
                <div 
                  key={index} 
                  className="relative p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200 group"
                >
                  <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => handleTeacherClick(teacher.name)}
                  >
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium group-hover:text-primary transition-colors">
                        {teacher.name}
                      </h3>
                      {teacher.phoneNumber && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="text-primary">📱</span> {teacher.phoneNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
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

      {/* Navigation Button to Assigned Substitutes Page */}
      <div className="flex justify-center py-6">
        <Button
          onClick={() => setLocation('/assigned-substitutes')}
          className="w-full sm:w-auto text-base gap-2 h-12"
          variant="default"
          size="lg"
        >
          View Assigned Substitutes
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}