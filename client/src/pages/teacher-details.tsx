
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
  const [normalizedName, setNormalizedName] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDay());
  const [teacherSchedule, setTeacherSchedule] = useState<TeacherSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Get current day
  function getCurrentDay() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  // Fetch teacher data from total_teacher.json
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

  // Find the matching teacher based on name or variations
  useEffect(() => {
    if (!teacherName || teacherDataLoading || !teacherData) return;

    // If there's no teacher name or it's empty, show error
    if (!teacherName.trim()) {
      toast({
        title: "No teacher selected",
        description: "Please select a teacher first",
        variant: "destructive"
      });
      navigate("/manage-absences");
      return;
    }

    // Normalize the name for comparison
    const searchName = teacherName.toLowerCase().trim();
    
    // First check if we can find the teacher in teacherData by name
    let foundTeacher = teacherData.find((t: any) => 
      t.name.toLowerCase() === searchName
    );

    // If not found, try to find via teacher variations
    if (!foundTeacher) {
      // Fetch the total_teacher data to check variations
      fetch('/data/total_teacher.json')
        .then(res => res.json())
        .then(totalTeachers => {
          // Check if the teacher name matches any variations
          const matchedTeacher = totalTeachers.find((t: TeacherVariation) => {
            if (t.name.toLowerCase() === searchName) return true;
            if (t.variations && Array.isArray(t.variations)) {
              return t.variations.some(v => v.toLowerCase() === searchName);
            }
            return false;
          });

          if (matchedTeacher) {
            setNormalizedName(matchedTeacher.name);
            fetchTeacherSchedule(matchedTeacher.name);
          } else {
            toast({
              title: "Teacher not found",
              description: `Could not find a teacher matching "${teacherName}"`,
              variant: "destructive"
            });
            navigate("/manage-absences");
          }
        })
        .catch(error => {
          console.error("Error fetching total teacher data:", error);
          toast({
            title: "Error",
            description: "Failed to load teacher data",
            variant: "destructive"
          });
        });
    } else {
      // If found directly in teacherData
      setNormalizedName(foundTeacher.name);
      fetchTeacherSchedule(foundTeacher.name);
    }
  }, [teacherName, teacherData, teacherDataLoading]);

  // Fetch teacher schedule data
  const fetchTeacherSchedule = async (name: string) => {
    setIsLoading(true);
    try {
      const dayScheduleResponse = await fetch(`/api/schedule/${selectedDay}`);
      
      if (!dayScheduleResponse.ok) {
        throw new Error("Failed to fetch schedule data");
      }
      
      const daySchedules = await dayScheduleResponse.json();
      
      // Filter schedules for this teacher (considering name variations)
      const lowerCaseName = name.toLowerCase();
      const teacherSchedules = daySchedules.filter((schedule: any) => {
        const scheduleName = schedule.teacherName.toLowerCase();
        return scheduleName === lowerCaseName || 
               scheduleName.includes(lowerCaseName) || 
               lowerCaseName.includes(scheduleName);
      });
      
      // Sort by period
      teacherSchedules.sort((a: any, b: any) => a.period - b.period);
      
      setTeacherSchedule(teacherSchedules);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching teacher schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load teacher schedule",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Handle day selection change
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    if (normalizedName) {
      fetchTeacherSchedule(normalizedName);
    }
  };

  const handleGoBack = () => {
    navigate("/manage-absences");
  };

  // Show loading state
  if (isLoading || teacherDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // If no teacher found, show error
  if (!normalizedName && teacherName) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Teacher Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Could not find teacher: {teacherName}</p>
            <Button className="mt-4" onClick={handleGoBack}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{normalizedName}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedDay} className="w-full">
            <TabsList className="grid grid-cols-7 mb-4">
              {weekdays.map((day) => (
                <TabsTrigger
                  key={day}
                  value={day}
                  onClick={() => handleDayChange(day)}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </TabsTrigger>
              ))}
            </TabsList>

            {weekdays.map((day) => (
              <TabsContent key={day} value={day}>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {day.charAt(0).toUpperCase() + day.slice(1)} Schedule
                  </h3>
                  {teacherSchedule.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {teacherSchedule.map((schedule, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 bg-muted/30"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              Class {schedule.className}
                            </span>
                            <Badge variant="outline">
                              Period {schedule.period}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No classes scheduled for this day.
                    </p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
