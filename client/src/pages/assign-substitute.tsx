import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface LocalStorageData {
  absences: any[];
  substitutes: {
    teacherId: number;
    substituteId: string;
    date: string;
  }[];
}

export default function AssignSubstitutePage() {
  const { teacherId } = useParams();
  const [setLocation] = useLocation();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absentTeachers } = useQuery({
    queryKey: ["/api/absent-teachers"],
    queryFn: async () => {
      const res = await fetch('/api/absent-teachers');
      if (!res.ok) throw new Error('Failed to fetch absent teachers');
      return res.json();
    }
  });

  const getLocalStorageData = (): LocalStorageData => {
    const stored = localStorage.getItem('teacherAbsenceData');
    return stored ? JSON.parse(stored) : { absences: [], substitutes: [] };
  };

  const setLocalStorageData = (data: LocalStorageData) => {
    localStorage.setItem('teacherAbsenceData', JSON.stringify(data));
  };

  const absentTeacher = absentTeachers?.find((t: any) => t.id === parseInt(teacherId || "0"));
  const availableSubstitutes = teachers?.filter(t => t.isSubstitute) || [];

  const handleAssignSubstitute = async (substituteId: string) => {
    if (!absentTeacher) return;

    const localData = getLocalStorageData();

    // Add new substitute assignment
    localData.substitutes.push({
      teacherId: parseInt(teacherId!),
      substituteId,
      date: today
    });

    // Update local storage
    setLocalStorageData(localData);

    // Update the absent teacher record
    try {
      await fetch(`/api/absent-teachers/${absentTeacher.id}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substituteId })
      });
    } catch (error) {
      console.error('Failed to update absent teacher:', error);
    }

    // Navigate back to absences page
    setLocation('/manage-absences');
  };

  if (!absentTeacher) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Teacher not found or no longer absent
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Substitute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Absent Teacher Details</h3>
              <p className="text-sm text-muted-foreground">
                {absentTeacher.name}
              </p>
              {absentTeacher.phoneNumber && (
                <p className="text-sm text-muted-foreground">
                  Phone: {absentTeacher.phoneNumber}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Available Substitutes</h3>
              <div className="space-y-2">
                {availableSubstitutes.map(substitute => {
                  // Check if substitute is already assigned today
                  const localData = getLocalStorageData();
                  const isAssignedToday = localData.substitutes.some(
                    sub => sub.substituteId === substitute.id && sub.date === today
                  );

                  return (
                    <Button
                      key={substitute.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAssignSubstitute(substitute.id.toString())}
                      disabled={isAssignedToday}
                    >
                      {substitute.name}
                      {isAssignedToday && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Already assigned today)
                        </span>
                      )}
                    </Button>
                  );
                })}
                {availableSubstitutes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No substitute teachers available
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}