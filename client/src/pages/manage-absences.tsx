import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarX, RefreshCcw, Clock, UserCheck, School } from "lucide-react";
import TeacherTimetable from "@/components/ui/teacher-timetable";
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignedTeachersPage from './assigned-teachers-page';


interface AbsentTeacher {
  name: string;
  phoneNumber?: string;
  date: string;
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
  const [activeTab, setActiveTab] = useState("absent");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch absent teachers
  const { data: absentTeachers = [], isLoading: isLoadingAbsent, refetch: refetchAbsentTeachers } = useQuery<AbsentTeacher[]>({
    queryKey: ["/api/get-absent-teachers"],
  });

  // Fetch substitute assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/substitute-assignments"],
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);

    try {
      await Promise.all([
        refetchAbsentTeachers(),
        refetchAssignments()
      ]);

      toast({
        title: "Data refreshed",
        description: "The latest information has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
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
        <div className="flex justify-between items-center mb-4">
          <div className="w-10"></div>
          <h1 className="text-3xl font-bold text-primary">Manage Absences</h1>
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
      </div>

      <Tabs defaultValue="absent" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="absent">Absent Teachers</TabsTrigger>
          <TabsTrigger value="assigned">Assigned Substitutes</TabsTrigger>
        </TabsList>

        <TabsContent value="absent">
          {/* Absent Teachers Section */}
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Absent Teachers - {format(new Date(today), 'MMMM d, yyyy')}
              </CardTitle>
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
                    <div key={index} className="relative p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned">
          <AssignedTeachersPage key={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
}