
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarX, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";
import TeacherTimetable from "@/components/ui/teacher-timetable";

export default function ManageAbsences() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { data: absentTeachers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/get-absent-teachers'],
    queryFn: async () => {
      const response = await fetch('/api/get-absent-teachers');
      if (!response.ok) {
        throw new Error("Failed to fetch absent teachers");
      }
      return response.json();
    }
  });
  
  const removeAbsenceMutation = useMutation({
    mutationFn: async (teacher: string) => {
      const response = await fetch('/api/remove-absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherName: teacher }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove absence');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Absence removed",
        description: "Teacher has been marked as present.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/get-absent-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
    },
    onError: (error: Error) => {
      console.error('Error removing absence:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove absence.",
        variant: "destructive"
      });
    },
  });
  
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Absent teacher list updated.",
    });
  };
  
  const handleRemoveAbsence = (teacher: string) => {
    removeAbsenceMutation.mutate(teacher);
  };
  
  const toggleTeacherTimetable = (teacherName: string) => {
    setSelectedTeacher(prevSelected => 
      prevSelected === teacherName ? null : teacherName
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Absences</h1>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Absent Teachers</CardTitle>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : absentTeachers.length === 0 ? (
            <div className="text-center py-8">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No absent teachers for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {absentTeachers.map((teacher, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-4 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{teacher.name}</h3>
                      {teacher.phoneNumber && (
                        <p className="text-sm text-muted-foreground">
                          📱 {teacher.phoneNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTeacherTimetable(teacher.name)}
                      >
                        Schedule
                        {selectedTeacher === teacher.name ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                        }
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAbsence(teacher.name)}
                        disabled={removeAbsenceMutation.isPending}
                      >
                        {removeAbsenceMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Remove"
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {selectedTeacher === teacher.name && (
                    <TeacherTimetable 
                      teacherName={teacher.name}
                      isOpen={selectedTeacher === teacher.name}
                      onToggle={() => toggleTeacherTimetable(teacher.name)}
                    />
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
