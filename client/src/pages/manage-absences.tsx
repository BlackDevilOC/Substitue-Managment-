
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

export default function ManageAbsencesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

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

  const handleTeacherClick = (teacherName: string) => {
    if (selectedTeacher === teacherName) {
      setSelectedTeacher(null);
    } else {
      setSelectedTeacher(teacherName);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Absences</h1>
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
    </div>
  );
}
