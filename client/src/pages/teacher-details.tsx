import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TeacherSchedule {
  period: number;
  className: string;
}

interface TeacherVariation {
  name: string;
  phone: string;
  variations: string[];
}

export default function TeacherDetailsPage() {
  const [, params] = useLocation();
  const teacherName = decodeURIComponent(params.split("/").pop() || "");
  const { toast } = useToast();
  const [selectedVariation, setSelectedVariation] = useState<string>(teacherName);
  const [showVariations, setShowVariations] = useState(false);

  // Get current day
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Fetch teacher schedule
  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ["/api/schedule", currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/schedule/${currentDay}`);
      if (!res.ok) {
        throw new Error("Failed to fetch schedule");
      }
      return res.json();
    },
  });

  // Fetch teacher variations from total_teacher.json
  const { data: teacherData } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch('/api/teachers');
      if (!res.ok) {
        throw new Error("Failed to fetch teacher data");
      }
      return res.json();
    },
  });

  // Filter schedule for the selected teacher
  const teacherSchedule = React.useMemo(() => {
    if (!schedule || !selectedVariation) return [];
    
    return schedule
      .filter((s: any) => {
        const teacher = teacherData?.find((t: any) => t.name === selectedVariation);
        return teacher && s.teacherId === teacher.id;
      })
      .map((s: any) => ({
        period: s.period,
        className: s.className
      }))
      .sort((a: TeacherSchedule, b: TeacherSchedule) => a.period - b.period);
  }, [schedule, selectedVariation, teacherData]);

  // If no schedule found, check for variations
  useEffect(() => {
    if (teacherSchedule.length === 0 && teacherData) {
      const foundTeacher = teacherData.find((t: any) => 
        t.name.toLowerCase() === selectedVariation.toLowerCase()
      );
      
      if (!foundTeacher) {
        setShowVariations(true);
        toast({
          title: "Schedule Not Found",
          description: "Please select a name variation to view the schedule",
          variant: "destructive",
        });
      }
    }
  }, [teacherSchedule, teacherData, selectedVariation]);

  return (
    <div className="container py-6 space-y-6">
      <Button onClick={() => window.history.back()} variant="outline">
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            {selectedVariation}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Schedule for {format(new Date(), "EEEE, MMMM d")}
          </div>
        </CardHeader>
        <CardContent>
          {showVariations && teacherData && (
            <div className="mb-6 p-4 border rounded-lg bg-warning/5">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5" />
                Select Correct Name Variation
              </h3>
              <div className="grid gap-2">
                {teacherData.map((t: any) => (
                  <Button
                    key={t.name}
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      setSelectedVariation(t.name);
                      setShowVariations(false);
                    }}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!showVariations && (
            <div className="space-y-4">
              {teacherSchedule.map((item: TeacherSchedule) => (
                <div
                  key={item.period}
                  className="p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    Period {item.period}
                  </div>
                  <div className="font-semibold">{item.className}</div>
                </div>
              ))}
              
              {teacherSchedule.length === 0 && !scheduleLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No classes scheduled for today
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
