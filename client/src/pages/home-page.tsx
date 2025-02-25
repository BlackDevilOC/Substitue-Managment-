import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, UserCheck, UserMinus, LogOut, Upload, Clock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import React, { useState } from "react";

function getCurrentPeriod() {
  const now = new Date();
  const hours = now.getHours();
  // This is a simple mapping, adjust the times according to your school schedule
  if (hours < 9) return 1;
  if (hours < 10) return 2;
  if (hours < 11) return 3;
  if (hours < 12) return 4;
  if (hours < 13) return 5;
  if (hours < 14) return 6;
  if (hours < 15) return 7;
  return 8;
}

function getDayOfWeek() {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
}

function getInitialPeriod() {
  return getCurrentPeriod();
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const currentDay = getDayOfWeek();
  const [currentPeriod, setCurrentPeriod] = useState(getInitialPeriod());

  const { data: currentSchedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule", currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/schedule/${currentDay}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    }
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const uploadTimetableMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/timetable', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload timetable');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Success",
        description: "Timetable uploaded successfully",
      });
    },
  });

  const isLoading = loadingAbsences || loadingTeachers || loadingSchedule;

  const currentTeachers = React.useMemo(() => {
    if (!currentSchedule || !teachers || !absences) return [];
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return currentSchedule
      .filter(s => s.period === currentPeriod)
      .map(schedule => {
        const teacher = teachers.find(t => t.id === schedule.teacherId);
        const isAbsent = absences.some(
          a => a.teacherId === teacher?.id && 
          format(new Date(a.date), "yyyy-MM-dd") === todayStr
        );

        let substituteTeacher = null;
        if (isAbsent) {
          const absence = absences.find(
            a => a.teacherId === teacher?.id && 
            format(new Date(a.date), "yyyy-MM-dd") === todayStr
          );
          if (absence?.substituteId) {
            substituteTeacher = teachers.find(t => t.id === absence.substituteId);
          }
        }

        return {
          className: schedule.className,
          teacher: isAbsent 
            ? substituteTeacher 
              ? `${substituteTeacher.name} (Substitute)`
              : "Teacher Absent"
            : teacher?.name || "No teacher"
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [currentSchedule, teachers, absences, currentPeriod]);

  return (
    <div className="container p-4">
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <Button variant="destructive" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Schedule - Period {currentPeriod}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button onClick={() => setCurrentPeriod(p => p === 1 ? 8 : p - 1)}>Previous Period</Button>
                <span className="mx-2">Period {currentPeriod}</span>
                <Button onClick={() => setCurrentPeriod(p => p === 8 ? 1 : p + 1)}>Next Period</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Timetable</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadTimetableMutation.mutate(file);
                }}
              />
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentTeachers.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border rounded">
                    <span>{item.className}</span>
                    <span>{item.teacher}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}