
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

  if (teacherDataLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
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

            <Tabs defaultValue={selectedDay} onValueChange={setSelectedDay}>
              <TabsList className="grid grid-cols-7 mb-4">
                <TabsTrigger value="monday">Mon</TabsTrigger>
                <TabsTrigger value="tuesday">Tue</TabsTrigger>
                <TabsTrigger value="wednesday">Wed</TabsTrigger>
                <TabsTrigger value="thursday">Thu</TabsTrigger>
                <TabsTrigger value="friday">Fri</TabsTrigger>
                <TabsTrigger value="saturday">Sat</TabsTrigger>
                <TabsTrigger value="sunday">Sun</TabsTrigger>
              </TabsList>

              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                <TabsContent key={day} value={day}>
                  <h3 className="text-lg font-medium capitalize mb-4">{day}'s Schedule</h3>
                  
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
                    <div className="flex items-center p-4 text-amber-800 bg-amber-50 rounded-md">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <p>No schedule found for {day}</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
