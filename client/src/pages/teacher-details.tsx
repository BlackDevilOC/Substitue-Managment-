import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [normalizedName, setNormalizedName] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDay());
  const [teacherSchedule, setTeacherSchedule] = useState<TeacherSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Get current day
  function getCurrentDay() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  // Fetch teacher variations from total_teacher.json
  const { data: teacherData, isLoading: teacherDataLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch('/api/teachers');
      if (!res.ok) {
        throw new Error("Failed to fetch teacher data");
      }
      return res.json();
    },
  });

  // Fetch teacher schedule
  useEffect(() => {
    const fetchTeacherSchedule = async () => {
      setIsLoading(true);
      try {
        // First, try to find the correct teacher name/variation
        if (teacherData && teacherName) {
          // Find the teacher in the data by comparing with all possible variations
          const foundTeacher = teacherData.find((teacher: any) =>
            teacher.name.toLowerCase() === teacherName.toLowerCase() ||
            (teacher.variations && teacher.variations.some((v: string) =>
              v.toLowerCase() === teacherName.toLowerCase()
            ))
          );

          if (foundTeacher) {
            // Get the normalized name to use for schedule lookup
            const normalName = foundTeacher.name.toLowerCase();
            setNormalizedName(normalName);

            // Fetch the actual schedule data
            const res = await fetch(`/api/teacher-schedule?name=${encodeURIComponent(normalName)}`);
            if (res.ok) {
              const data = await res.json();
              setTeacherSchedule(data);
            } else {
              toast({
                title: "Error",
                description: "Failed to fetch teacher schedule",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Teacher not found",
              description: `No matching teacher found for "${teacherName}"`,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching teacher schedule:", error);
        toast({
          title: "Error",
          description: "An error occurred while fetching teacher data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (teacherData) {
      fetchTeacherSchedule();
    }
  }, [teacherData, teacherName, toast]);

  // Filter schedule for the selected day
  const filteredSchedule = React.useMemo(() => {
    if (!teacherSchedule) return [];
    return teacherSchedule
      .filter(item => item.day === selectedDay)
      .sort((a, b) => a.period - b.period);
  }, [teacherSchedule, selectedDay]);

  // Show loading spinner while loading data
  if (teacherDataLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  // Show message if no teacher name was provided
  if (!teacherName) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 flex items-center mb-4">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          <p>No teacher name provided. Please select a teacher first.</p>
        </div>
        <Button onClick={() => navigate("/manage-absence")} variant="outline" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Absences
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => navigate('/absences')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Absences
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {teacherName}
              {normalizedName && normalizedName !== teacherName.toLowerCase() && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (Found as: {normalizedName})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teacherData && teacherName && (
              <div className="mb-4">
                {teacherData.find((t: any) =>
                  t.name.toLowerCase() === teacherName.toLowerCase() ||
                  (t.variations && t.variations.some((v: string) => v.toLowerCase() === teacherName.toLowerCase()))
                )?.phoneNumber && (
                  <p className="text-muted-foreground">
                    Phone: {teacherData.find((t: any) =>
                      t.name.toLowerCase() === teacherName.toLowerCase() ||
                      (t.variations && t.variations.some((v: string) => v.toLowerCase() === teacherName.toLowerCase()))
                    )?.phoneNumber}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {weekdays.map(day => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
                    onClick={() => setSelectedDay(day)}
                    className="capitalize"
                  >
                    {day}
                  </Button>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 capitalize">{selectedDay}'s Schedule</h3>
                {filteredSchedule.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSchedule.map((item, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">Period {item.period}</span>
                            <p className="text-sm text-muted-foreground">Class: {item.className.toUpperCase()}</p>
                          </div>
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-md text-center">
                    <p>No schedule found for {teacherName} on {selectedDay}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}