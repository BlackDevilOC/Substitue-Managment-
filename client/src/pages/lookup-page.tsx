import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Teacher {
  id: number;
  name: string;
  phoneNumber?: string;
}

interface ScheduleItem {
  day: string;
  period: number;
  className: string;
}

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function LookupPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scheduleResults, setScheduleResults] = useState<ScheduleItem[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(true);
  const [teacherVariations, setTeacherVariations] = useState<{[key: string]: string[]}>({});

  useEffect(() => {
    // Fetch teachers from API
    fetch('/api/teachers')
      .then(response => response.json())
      .then(data => {
        setTeachers(data);
        setIsLoadingTeachers(false);
      })
      .catch(error => {
        console.error('Error fetching teachers:', error);
        setIsLoadingTeachers(false);
      });

    // Fetch teacher variations from total_teacher.json
    fetch('/data/total_teacher.json')
      .then(response => response.json())
      .then(data => {
        const variations: {[key: string]: string[]} = {};
        data.forEach((teacher: any) => {
          variations[teacher.name] = teacher.variations || [];
        });
        setTeacherVariations(variations);
      })
      .catch(error => {
        console.error('Error fetching teacher variations:', error);
      });
  }, []);

  const handleTeacherSelect = (teacherName: string) => {
    setSelectedTeacher(teacherName);
    setIsLoading(true);
    
    fetch(`/api/teacher-schedule?name=${encodeURIComponent(teacherName)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch teacher schedule');
        }
        return response.json();
      })
      .then(data => {
        setScheduleResults(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching teacher schedule:', error);
        setScheduleResults([]);
        setIsLoading(false);
      });
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const filteredSchedule = scheduleResults.filter(item => 
    selectedDays.length === 0 || selectedDays.includes(item.day)
  );

  const validClasses = ['10A', '10B', '10C', '9A', '9B', '9C', '8A', '8B', '8C', '7A', '7B', '7C', '6A', '6B', '6C'];
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const LoadingSpinner = () => (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Teacher Schedule Lookup</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <Select
              value={selectedTeacher}
              onValueChange={handleTeacherSelect}
              disabled={isLoadingTeachers}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.name}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTeacher && (
              <div>
                <h3 className="text-sm font-medium mb-2">Filter by day:</h3>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1 text-sm rounded-full ${
                        selectedDays.includes(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSpinner />
      ) : selectedTeacher && filteredSchedule.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Schedule for {selectedTeacher}</CardTitle>
            {teacherVariations[selectedTeacher]?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Also known as: {teacherVariations[selectedTeacher].join(', ')}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedule.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="capitalize">{item.day}</TableCell>
                    <TableCell>{item.period}</TableCell>
                    <TableCell>{item.className}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : selectedTeacher ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No schedule found for {selectedTeacher}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}