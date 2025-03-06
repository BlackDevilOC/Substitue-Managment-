import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserCheck, Loader2, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TeacherStatus {
  teacherId: number;
  status: 'available' | 'assigned' | 'absent';
  assignedTo?: string;
  className?: string;
}

const SubstituteCardSkeleton = () => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="w-full">
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>
  </div>
);

// Function to send SMS using the device's native capabilities
const sendNativeSMS = async (phoneNumber: string, message: string) => {
  // Check if we're in a React Native WebView environment
  if (!(window as any).ReactNativeWebView) {
    console.error('Not running in React Native WebView');
    return false;
  }

  try {
    // Send message to React Native
    (window as any).ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'SEND_SMS',
        payload: {
          phoneNumber,
          message
        }
      })
    );
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
};

export default function SubstitutesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacherStatuses, setTeacherStatuses] = useState<TeacherStatus[]>([]);

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json();
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/substitute-assignments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/substitute-assignments");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ["/api/absences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/absences");
      return res.json();
    },
    enabled: !!user,
  });

  // Handler for sending SMS notifications
  const handleSendSMS = async (teacher: any, status: TeacherStatus) => {
    if (!teacher.phoneNumber) {
      toast({
        title: "No phone number available",
        description: "Cannot send SMS notification - no phone number provided.",
        variant: "destructive"
      });
      return;
    }

    const message = `Dear ${teacher.name},\n\nYou have been assigned to cover for ${status.assignedTo} in Class ${status.className}.\n\nPlease confirm your availability.`;

    const sent = await sendNativeSMS(teacher.phoneNumber, message);

    if (sent) {
      toast({
        title: "SMS Notification Sent",
        description: `Successfully sent SMS notification to ${teacher.name}`,
      });
    } else {
      toast({
        title: "Failed to Send SMS",
        description: "Could not send SMS notification. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const savedStatuses = localStorage.getItem('teacherStatuses');
    if (savedStatuses) {
      setTeacherStatuses(JSON.parse(savedStatuses));
    }
  }, []);

  useEffect(() => {
    if (teachers && assignments && absences) {
      const newStatuses: TeacherStatus[] = teachers.map((teacher: any) => {
        const assignment = assignments.find((a: any) =>
          a.substitute?.id === teacher.id || a.absence?.teacherId === teacher.id
        );

        const isAbsent = absences.some((a: any) => a.teacherId === teacher.id);

        let status: TeacherStatus = {
          teacherId: teacher.id,
          status: 'available'
        };

        if (isAbsent) {
          status.status = 'absent';
        } else if (assignment) {
          const absentTeacher = teachers.find((t: any) => t.id === assignment.absence?.teacherId);
          status.status = 'assigned';
          status.assignedTo = absentTeacher?.name || 'Unknown Teacher';
          status.className = assignment.className;
        }

        return status;
      });

      setTeacherStatuses(newStatuses);
      localStorage.setItem('teacherStatuses', JSON.stringify(newStatuses));
    }
  }, [teachers, assignments, absences]);

  if (teachersLoading || assignmentsLoading || absencesLoading) {
    return (
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <SubstituteCardSkeleton key={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTeachers = teachers || [];

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Substitute Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayTeachers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No teacher data available
              </div>
            )}

            {displayTeachers.map((teacher: any) => {
              const status = teacherStatuses.find(s => s.teacherId === teacher.id);

              return (
                <div key={teacher.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-grow">
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {status?.status === 'assigned' && (
                        <div className="text-sm text-muted-foreground">
                          Covering for: {status.assignedTo} in Class {status.className}
                        </div>
                      )}
                      {status?.status === 'absent' && (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive rounded-full text-xs">
                          Absent
                        </span>
                      )}
                      {status?.status === 'available' && (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                  {status?.status === 'assigned' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => handleSendSMS(teacher, status)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send SMS
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}