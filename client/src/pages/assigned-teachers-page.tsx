
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, AlertCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function AssignedTeachersPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  // Fetch substitute assignments
  const { data: assignmentsData, isLoading } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/substitute-assignments"],
  });

  // Group assignments by original teacher
  const groupedAssignments = assignmentsData?.assignments.reduce((acc, curr) => {
    if (!acc[curr.originalTeacher]) {
      acc[curr.originalTeacher] = [];
    }
    acc[curr.originalTeacher].push(curr);
    return acc;
  }, {} as Record<string, SubstituteAssignment[]>) || {};

  const handleTeacherClick = (teacherName: string) => {
    if (expandedTeacher === teacherName) {
      setExpandedTeacher(null);
    } else {
      setExpandedTeacher(teacherName);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!assignmentsData || assignmentsData.assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Substitute Assignments</h3>
          <p className="text-muted-foreground mt-2">
            There are no substitute teachers assigned currently.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warnings section */}
      {assignmentsData.warnings && assignmentsData.warnings.length > 0 && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-medium mb-1">Assignment Warnings</div>
            <ul className="list-disc pl-5 space-y-1">
              {assignmentsData.warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Substitute assignments card */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Substitute Assignments - {format(new Date(today), 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedAssignments).map(([teacher, assignments]) => (
              <div key={teacher} className="border rounded-lg overflow-hidden">
                <div
                  className="p-4 bg-muted/30 flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTeacherClick(teacher)}
                >
                  <h3 className="font-medium">{teacher}</h3>
                  <Badge variant="outline">
                    {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
                  </Badge>
                </div>
                
                {expandedTeacher === teacher && (
                  <ScrollArea className="max-h-[300px]">
                    <div className="p-4 space-y-3 divide-y">
                      {assignments.map((assignment, idx) => (
                        <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Period {assignment.period}</Badge>
                                <span className="font-medium">{assignment.className}</span>
                              </div>
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">Substitute:</span>{' '}
                                <span className="font-medium">{assignment.substitute}</span>
                              </p>
                            </div>
                            <a 
                              href={`tel:${assignment.substitutePhone}`} 
                              className="text-sm text-primary flex items-center gap-1 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {assignment.substitutePhone}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
