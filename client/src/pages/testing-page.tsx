
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';

interface Teacher {
  name: string;
  phone: string;
  variations: string[];
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

  // Fetch teachers from API
  useEffect(() => {
    async function fetchTeachers() {
      try {
        const response = await fetch('/api/teachers');
        if (!response.ok) {
          throw new Error('Failed to fetch teachers');
        }
        
        // Get the teacher data including variations from total_teacher.json
        const data = await response.json();
        
        // Read the data from total_teacher.json for variations
        const teacherResponse = await fetch('/data/total_teacher.json');
        if (teacherResponse.ok) {
          const teacherData = await teacherResponse.json();
          setTeachers(teacherData);
        } else {
          // Fallback if we can't get the detailed teacher data
          setTeachers(data.map((t: any) => ({ 
            name: t.name, 
            phone: t.phoneNumber || '', 
            variations: [t.name] 
          })));
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setIsLoadingTeachers(false);
      }
    }

    fetchTeachers();
  }, []);

  // Handle day selection
  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  // Handle search
  const handleSearch = async () => {
    if (!selectedTeacher || selectedDays.length === 0) {
      return;
    }

    setIsLoading(true);
    setScheduleResults([]);

    try {
      // Get variations of the selected teacher for matching
      const teacherObj = teachers.find(t => t.name === selectedTeacher);
      if (!teacherObj) {
        throw new Error('Teacher not found');
      }

      const allVariations = [teacherObj.name, ...teacherObj.variations];
      const results: ScheduleItem[] = [];

      // Fetch teacher schedule for each selected day
      for (const day of selectedDays) {
        try {
          // First try with the main teacher name
          const response = await fetch(`/api/teacher-schedule/${encodeURIComponent(selectedTeacher.toLowerCase())}`);
          const data = await response.json();
          
          // Filter by selected days
          const daySchedule = data.filter((item: any) => item.day.toLowerCase() === day.toLowerCase());
          
          if (daySchedule.length > 0) {
            results.push(...daySchedule);
          } else {
            // If no schedule found, try with variations
            for (const variation of allVariations) {
              if (variation === selectedTeacher) continue; // Skip the one we already tried
              
              const varResponse = await fetch(`/api/teacher-schedule/${encodeURIComponent(variation.toLowerCase())}`);
              const varData = await varResponse.json();
              
              const varDaySchedule = varData.filter((item: any) => item.day.toLowerCase() === day.toLowerCase());
              if (varDaySchedule.length > 0) {
                results.push(...varDaySchedule);
                break; // Found schedule with this variation, no need to try others
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching schedule for day ${day}:`, error);
        }
      }

      setScheduleResults(results);
    } catch (error) {
      console.error('Error searching teacher schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Schedule Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div>
              <Label htmlFor="teacher">Select Teacher</Label>
              <Select
                value={selectedTeacher}
                onValueChange={setSelectedTeacher}
              >
                <SelectTrigger id="teacher" className="w-full">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingTeachers ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Loading teachers...</span>
                    </div>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.name} value={teacher.name}>
                        {teacher.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Select Days</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`day-${day}`} 
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
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
              disabled={!selectedTeacher || selectedDays.length === 0 || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          {selectedTeacher && teachers.find(t => t.name === selectedTeacher) && (
            <div className="mt-6 border rounded-md p-4 bg-muted/30">
              <h3 className="font-semibold mb-2">Teacher Information</h3>
              <div className="grid gap-2">
                <div>
                  <span className="font-medium">Name:</span> {selectedTeacher}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {teachers.find(t => t.name === selectedTeacher)?.phone || 'Not available'}
                </div>
                <div>
                  <span className="font-medium">Name Variations:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                    {teachers.find(t => t.name === selectedTeacher)?.variations.map((variation, index) => (
                      <div key={index} className="text-sm bg-background p-1 rounded">
                        {variation}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {scheduleResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Schedule Results</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-2 text-left border-b">Day</th>
                      <th className="px-4 py-2 text-left border-b">Period</th>
                      <th className="px-4 py-2 text-left border-b">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleResults.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-2 border-b capitalize">{item.day}</td>
                        <td className="px-4 py-2 border-b">{item.period}</td>
                        <td className="px-4 py-2 border-b">{item.className}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {isLoading === false && scheduleResults.length === 0 && selectedTeacher && selectedDays.length > 0 && (
            <div className="mt-6 p-4 border rounded-md bg-muted/30 text-center">
              No schedule found for {selectedTeacher} on the selected days.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
