import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Teacher {
  id: number;
  name: string;
  phoneNumber: string | null;
}

interface ScheduleItem {
  day: string;
  period: number;
  className: string;
}

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function TestingPage() {
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

  const handleTeacherChange = (value: string) => {
    setSelectedTeacher(value);
  };

  const handleDayChange = (day: string) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSearch = () => {
    if (!selectedTeacher || selectedDays.length === 0) {
      alert('Please select a teacher and at least one day');
      return;
    }

    setIsLoading(true);

    // Get the schedule for the selected teacher
    fetch(`/api/teacher-schedule/${selectedTeacher}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch teacher schedule');
        }
        return response.json();
      })
      .then(data => {
        // Filter the schedule based on selected days
        const filteredSchedule = Array.isArray(data) 
          ? data.filter(item => selectedDays.includes(item.day))
          : [];

        setScheduleResults(filteredSchedule);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching teacher schedule:', error);
        setIsLoading(false);
        alert('Error fetching teacher schedule. Please try again.');
      });
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Schedule Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="teacher-select">Select Teacher</Label>
              <Select
                value={selectedTeacher}
                onValueChange={handleTeacherChange}
              >
                <SelectTrigger id="teacher-select" className="w-full">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTeachers ? (
                    <SelectItem value="loading" disabled>
                      Loading teachers...
                    </SelectItem>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.name}>
                        {teacher.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => handleDayChange(day)}
                    />
                    <Label htmlFor={`day-${day}`} className="capitalize">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSearch} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search Schedule'}
            </Button>
          </div>

          {selectedTeacher && teacherVariations[selectedTeacher] && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Name Variations</h3>
              <div className="text-sm space-y-1">
                {teacherVariations[selectedTeacher].map((variation, index) => (
                  <div key={index} className="bg-gray-50 p-1 rounded">
                    {variation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {scheduleResults.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Schedule Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Day</th>
                      <th className="border px-4 py-2 text-left">Period</th>
                      <th className="border px-4 py-2 text-left">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleResults.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="border px-4 py-2 capitalize">{item.day}</td>
                        <td className="border px-4 py-2">{item.period}</td>
                        <td className="border px-4 py-2">{item.className}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="mt-4 text-center">
              <p>Loading schedule data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}