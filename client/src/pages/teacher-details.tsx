
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
    
    // Look for exact match first
    let foundTeacher = teacherData.find((t: any) => 
      t.name.toLowerCase() === searchName
    );

    // If no exact match, try to match against variations
    if (!foundTeacher && Array.isArray(teacherData)) {
      foundTeacher = teacherData.find((t: any) => {
        if (t.variations && Array.isArray(t.variations)) {
          return t.variations.some((v: string) => 
            v.toLowerCase() === searchName
          );
        }
        return false;
      });
    }

    if (foundTeacher) {
      setNormalizedName(foundTeacher.name);
      fetchTeacherSchedule(foundTeacher.name);
    } else {
      toast({
        title: "Teacher not found",
        description: `Could not find a teacher matching "${teacherName}"`,
        variant: "destructive"
      });
      navigate("/manage-absences");
    }
  }, [teacherName, teacherData, teacherDataLoading]);

  // Fetch teacher schedule data
  const fetchTeacherSchedule = async (name: string) => {
    setIsLoading(true);
    try {
      // First try with the normalized name
      let response = await fetch(`/api/schedule/${selectedDay}?teacherName=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        // If that fails, try with the original name
        response = await fetch(`/api/schedule/${selectedDay}?teacherName=${encodeURIComponent(teacherName)}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch teacher schedule");
        }
      }
      
      const data = await response.json();
      setTeacherSchedule(data);
    } catch (error) {
      console.error("Error fetching teacher schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load teacher schedule",
        variant: "destructive"
      });
    } finally {
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
              <TabsContent key={day} value={day} className="space-y-4">
                <h3 className="font-semibold text-lg">
                  Schedule for {day.charAt(0).toUpperCase() + day.slice(1)}
                </h3>
                
                {teacherSchedule.length === 0 ? (
                  <p>No classes scheduled for this day.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherSchedule
                      .sort((a, b) => a.period - b.period)
                      .map((schedule, index) => (
                        <Card key={index}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium">Period {schedule.period}</p>
                              <p className="text-sm text-muted-foreground">
                                Class: {schedule.className.toUpperCase()}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {schedule.period}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
