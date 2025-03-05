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
              <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
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
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignedTeachersPage from './assigned-teachers-page';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { RefreshCw, UserCheck } from "lucide-react";
import { Loader2 } from "lucide-react";

// If you have other components for absences management, import them here
// import AbsentTeachersComponent from './absent-teachers-component';

export default function ManageAbsencesPage() {
  const [activeTab, setActiveTab] = useState("absent");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // This function will be used to refresh data for all tabs
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Teacher Absences & Substitutions</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All Data
        </Button>
      </div>

      <Tabs defaultValue="absent" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="absent">Absent Teachers</TabsTrigger>
          <TabsTrigger value="assigned">Assigned Substitutes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="absent">
          {/* Your existing AbsentTeachers component or code here */}
          <Card>
            <CardHeader>
              <CardTitle>Absent Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Absent teachers component goes here</p>
              {/* Replace this with your actual absent teachers component */}
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
