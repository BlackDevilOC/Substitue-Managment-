
import { useState } from 'react';
import { useToast } from '../components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

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

export default function AssignedSubstitutePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedAssignmentTeacher, setSelectedAssignmentTeacher] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch substitute assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery<AssignmentsResponse>({
    queryKey: ["/api/substitute-assignments"],
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchAssignments();
      toast({
        title: "Data refreshed",
        description: "The substitute assignments have been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Error refreshing data",
        description: "Something went wrong.",
        variant: "destructive",
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
          <h1 className="text-3xl font-bold text-primary">Assigned Substitutes</h1>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={isRefreshing || isLoadingAssignments}
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

      {/* Substitute Assignments section */}
      <div className="w-full space-y-4">
        <h2 className="text-xl font-semibold">Substitute Assignments</h2>
        
        {assignmentsData?.warnings && assignmentsData.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <h3 className="font-semibold text-amber-800 mb-2">Warnings</h3>
            <ul className="list-disc pl-5 text-amber-700 text-sm">
              {assignmentsData.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groupedAssignments).map(([teacherName, assignments]) => (
            <Card key={teacherName} className={selectedAssignmentTeacher === teacherName ? "border-primary" : ""}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => handleAssignmentTeacherClick(teacherName)}>
                <CardTitle className="flex justify-between items-center">
                  <span>{teacherName}</span>
                  <Badge>{assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}</Badge>
                </CardTitle>
              </CardHeader>
              {selectedAssignmentTeacher === teacherName && (
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-medium">Assigned Substitutes</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Period</th>
                          <th className="text-left py-2">Class</th>
                          <th className="text-left py-2">Substitute</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((assignment, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2">{assignment.period}</td>
                            <td className="py-2">{assignment.className}</td>
                            <td className="py-2">
                              {assignment.substitute}
                              <div className="text-xs text-muted-foreground">
                                {assignment.substitutePhone}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {Object.keys(groupedAssignments).length === 0 && (
            <div className="col-span-2 bg-muted/20 rounded-lg p-6 text-center">
              <p className="text-muted-foreground">No substitute assignments found.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => setLocation('/manage-absences')}>
          Back to Manage Absences
        </Button>
      </div>
    </div>
  );
}
