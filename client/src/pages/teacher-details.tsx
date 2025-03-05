
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TeacherSchedule {
  day: string;
  period: number;
  className: string;
}

interface TeacherVariation {
  name: string;
  phone: string;
  variations: string[];
}

export default function TeacherDetailsPage() {
  const [_, navigate] = useLocation();
  const params = useParams<{ name: string }>();
  const teacherName = params?.name ? decodeURIComponent(params.name) : "";
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDay());
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  // Get current day
  function getCurrentDay() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  // Query to fetch the teacher's schedule for the current day
  const { 
    data: teacherDaySchedule, 
    isLoading: scheduleLoading,
    refetch: refetchDaySchedule,
    error: scheduleError
  } = useQuery({
    queryKey: [`/api/teacher-day-schedule`, teacherName, selectedDay],
    queryFn: async () => {
      if (!teacherName) {
        throw new Error("Teacher name is required");
      }

      const res = await fetch(`/api/teacher-day-schedule?name=${encodeURIComponent(teacherName)}&day=${selectedDay}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch schedule");
      }
      return res.json();
    },
    enabled: !!teacherName,
    retry: 1
  });

  // Handle errors in the schedule fetching
  useEffect(() => {
    if (scheduleError) {
      toast({
        title: "Error",
        description: scheduleError instanceof Error ? scheduleError.message : "Failed to load teacher schedule",
        variant: "destructive"
      });
    }
  }, [scheduleError, toast]);

  // If there's no teacher name, redirect back
  useEffect(() => {
    if (!teacherName.trim()) {
      toast({
        title: "No teacher selected",
        description: "Please select a teacher first",
        variant: "destructive"
      });
      navigate("/manage-absences");
    }
  }, [teacherName, navigate, toast]);

  // Handle day selection change
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
  };

  // When day changes, refetch the schedule
  useEffect(() => {
    if (teacherName) {
      refetchDaySchedule();
    }
  }, [selectedDay, refetchDaySchedule, teacherName]);

  const handleGoBack = () => {
    navigate("/manage-absences");
  };

  if (!teacherName) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="container p-4">
      <div className="flex items-center mb-4 space-x-2">
        <Button variant="outline" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {teacherDaySchedule?.teacherName || teacherName}
        </h1>
        {teacherDaySchedule?.teacherInfo?.phone && (
          <Badge variant="outline" className="ml-2">
            📱 {teacherDaySchedule.teacherInfo.phone}
          </Badge>
        )}
      </div>

      <Tabs defaultValue={selectedDay} onValueChange={handleDayChange} className="w-full">
        <TabsList className="mb-4 grid grid-cols-3 md:grid-cols-6 md:w-fit">
          {weekdays.map((day) => (
            <TabsTrigger
              key={day}
              value={day}
              className="capitalize"
              data-active={day === selectedDay}
            >
              {day}
            </TabsTrigger>
          ))}
        </TabsList>

        {weekdays.map((day) => (
          <TabsContent key={day} value={day} className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg capitalize">
                  {day}'s Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduleLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : teacherDaySchedule?.schedule && teacherDaySchedule.schedule.length > 0 ? (
                  <div className="space-y-3">
                    {teacherDaySchedule.schedule
                      .sort((a: TeacherSchedule, b: TeacherSchedule) => a.period - b.period)
                      .map((item: TeacherSchedule, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center">
                              {item.period}
                            </Badge>
                            <div>
                              <div className="font-medium">Class {item.className.toUpperCase()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No schedule found for this day
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
