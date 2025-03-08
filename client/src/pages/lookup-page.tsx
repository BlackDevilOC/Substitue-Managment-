import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LookupPage() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const { toast } = useToast();

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['/api/schedules', selectedClass, selectedDay],
    enabled: !!(selectedClass && selectedDay)
  });

  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['/api/teachers'],
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load teacher data",
        variant: "destructive",
      });
    }
  });

  const { data: teacherSchedule, isLoading: teacherScheduleLoading } = useQuery({
    queryKey: ['/api/teacher-schedule', selectedTeacher, selectedDay],
    enabled: !!selectedTeacher
  });

  const validClasses = ['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C', '7A', '7B', '7C', '6A', '6B', '6C'];
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const LoadingSpinner = () => (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Timetable Lookup</h1>

      <Tabs defaultValue="class" className="space-y-4">
        <TabsList>
          <TabsTrigger value="class">Class Timetable</TabsTrigger>
          <TabsTrigger value="teacher">Teacher Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <Card>
            <CardHeader>
              <CardTitle>Class Timetable Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Select onValueChange={setSelectedClass} value={selectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {validClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setSelectedDay} value={selectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {validDays.map(day => (
                      <SelectItem key={day} value={day.toLowerCase()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {scheduleLoading ? (
                <LoadingSpinner />
              ) : scheduleData?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Teacher</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleData.map((schedule: any) => (
                      <TableRow key={schedule.period}>
                        <TableCell>{schedule.period}</TableCell>
                        <TableCell>{schedule.time}</TableCell>
                        <TableCell>{schedule.teacher}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : selectedClass && selectedDay ? (
                <div className="text-center text-muted-foreground py-8">
                  No schedule found for the selected class and day
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a class and day to view the timetable
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Schedule Lookup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Select onValueChange={setSelectedTeacher} value={selectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherData?.map((teacher: any) => (
                      <SelectItem key={teacher.id || teacher.name} value={teacher.id?.toString() || teacher.name}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {teacherScheduleLoading ? (
                <LoadingSpinner />
              ) : teacherSchedule?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherSchedule.map((schedule: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="capitalize">{schedule.day}</TableCell>
                        <TableCell>{schedule.period}</TableCell>
                        <TableCell>{schedule.className}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : selectedTeacher ? (
                <div className="text-center text-muted-foreground py-8">
                  No schedule found for the selected teacher
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a teacher to view their schedule
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}