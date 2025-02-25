import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface LocalStorageData {
  absences: any[];
  substitutes: {
    classId: string;
    substituteId: string;
    date: string;
  }[];
}

export default function AssignSubstitutePage() {
  const { classId } = useParams();
  const [setLocation] = useLocation(); //removed unused location variable
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: schedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const getLocalStorageData = (): LocalStorageData => {
    const stored = localStorage.getItem('teacherAbsenceData');
    return stored ? JSON.parse(stored) : { absences: [], substitutes: [] };
  };

  const setLocalStorageData = (data: LocalStorageData) => {
    localStorage.setItem('teacherAbsenceData', JSON.stringify(data));
  };

  const classInfo = schedule?.find(s => s.id === parseInt(classId || "0"));
  const teacher = teachers?.find(t => t.id === classInfo?.teacherId);
  const availableSubstitutes = teachers?.filter(t => t.isSubstitute) || [];

  const handleAssignSubstitute = (substituteId: string) => {
    const localData = getLocalStorageData();

    // Add new substitute assignment
    localData.substitutes.push({
      classId: classId!,
      substituteId,
      date: today
    });

    // Update local storage
    setLocalStorageData(localData);

    // Navigate back to absences page
    setLocation('/manage-absences');
  };

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Substitute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Class Details</h3>
              <p className="text-sm text-muted-foreground">
                {classInfo?.className} - Period {classInfo?.period}
              </p>
              <p className="text-sm text-muted-foreground">
                Absent Teacher: {teacher?.name}
              </p>
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
                      onClick={() => handleAssignSubstitute(substitute.id)}
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