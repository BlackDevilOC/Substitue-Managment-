
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/card";
import { Loader2, RefreshCw, UserCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Assignment {
  originalTeacher: string;
  period: number;
  className: string;
  substitute: string;
  substitutePhone: string;
}

interface AssignedTeacherData {
  assignments: Assignment[];
  warnings: string[];
}

export default function AssignedTeachersPage() {
  const [data, setData] = useState<AssignedTeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/substitute-assignments');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const assignmentData = await response.json();
      setData(assignmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
      console.error('Error fetching substitute assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleRefresh = () => {
    fetchAssignments();
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Assigned Teachers</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Substitute Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : (
            <>
              {data?.assignments && data.assignments.length > 0 ? (
                <div className="space-y-4">
                  {data.assignments.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Original Teacher</p>
                          <p className="font-medium">{assignment.originalTeacher}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Substitute</p>
                          <p className="font-medium">{assignment.substitute}</p>
                          <p className="text-xs text-muted-foreground">{assignment.substitutePhone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Class</p>
                          <p className="font-medium">{assignment.className}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Period</p>
                          <p className="font-medium">{assignment.period}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments found
                </div>
              )}

              {data?.warnings && data.warnings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium mb-2">Warnings</h3>
                  <ul className="space-y-1 text-sm text-amber-600 list-disc pl-5">
                    {data.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
