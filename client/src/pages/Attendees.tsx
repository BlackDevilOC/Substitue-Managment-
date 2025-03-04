import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Teacher } from "@shared/schema"
import { Card, CardContent } from "@/components/ui/card"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { toast } from "@/hooks/use-toast"

// Define interface for teacher data in JSON file
interface TeacherJson {
  name: string;
  phone: string;
  variations: string[];
}

export default function Attendees() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({})
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>([])

  // Load teachers directly from JSON file on component mount
  const [teachersLoading, setTeachersLoading] = useState<boolean>(true);

  // Load teachers from local JSON file
  const loadTeachersFromJson = async () => {
    setTeachersLoading(true);
    try {
      // Show loading toast
      toast({
        title: "Loading teachers...",
        description: "Loading teachers from local data file.",
      });

      // Use the direct import approach instead of fetch to bypass server
      const teachersData = [
        { "name": "Sir Bakir Shah", "phone": "+923156103995" },
        { "name": "Sir Mushtaque Ahmed", "phone": "" },
        { "name": "Sir Irshad Qureshi", "phone": "+923123131179" },
        { "name": "Sir Muhammad Taha", "phone": "+923163745043" },
        { "name": "Sir Shafique Ahmed", "phone": "+923337199001" },
        { "name": "Sir Iqbal Ahmed", "phone": "+923063624407" },
        { "name": "Sir Asif Nawaz", "phone": "+923122084340" },
        { "name": "Sir Amir Shaikh Senior", "phone": "+923013437378" },
        { "name": "Miss Romalia", "phone": "+923457999449" },
        { "name": "Sir Jamalullah", "phone": "+923133362621" },
        { "name": "Sir Abdul Hameed", "phone": "" },
        { "name": "Sir Abdul Sami", "phone": "+923110022088" },
        { "name": "Sir Faiz Hussain", "phone": "+923003150206" },
        { "name": "Sir Usama", "phone": "+923143779477" },
        { "name": "Sir Waqar Ali", "phone": "+923113588606" },
        { "name": "Sir Faisal Ali", "phone": "+923473093995" },
        { "name": "Sir Romanulabdin", "phone": "+923048151502" },
        { "name": "Sir Anwar Ali", "phone": "" },
        { "name": "Sir Aman Arif", "phone": "+923147500857" },
        { "name": "Sir Khadim Hussain", "phone": "+923013976248" },
        { "name": "Sir Jawad-ul-Haq", "phone": "+923153122161" },
        { "name": "Sir Faraz Ahmed", "phone": "+923003150206" },
        { "name": "Sir Imran Ahmed", "phone": "+923328231536" },
        { "name": "Miss Anum Hussain", "phone": "+923090782869" },
        { "name": "Sir Irshad Bhutto", "phone": "+923147117789" },
        { "name": "Sir Meer Muhammad", "phone": "+923153555253" },
        { "name": "Sir Shumail Arsalan", "phone": "+923069403635" },
        { "name": "Sir Farhan Siddiqui", "phone": "+923161361117" },
        { "name": "Sir Rafaqat Masseh", "phone": "+923023661737" },
        { "name": "Sir Wajiudin Shaikh", "phone": "" },
        { "name": "Sir Shoaib", "phone": "+923154988546" },
        { "name": "Sir Abdul Rehman", "phone": "+923337208667" },
        { "name": "sir jawad ul haq", "phone": "" },
        { "name": "sir shabeer ahmedb", "phone": "" },
        { "name": "sir irshad ahmed", "phone": "" }
      ];

      // Convert to Teacher format with IDs
      const formattedTeachers: Teacher[] = teachersData.map((teacher, index) => ({
        id: index + 1,
        name: teacher.name,
        phoneNumber: teacher.phone,
        // Add any other required fields from your Teacher schema
      }));

      setLocalTeachers(formattedTeachers);

      toast({
        title: "Teachers loaded",
        description: `Successfully loaded ${formattedTeachers.length} teachers from local data.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error loading teachers:", error);
      toast({
        title: "Error loading teachers",
        description: error instanceof Error ? error.message : "Failed to load teachers data",
        variant: "destructive",
      });
    } finally {
      setTeachersLoading(false);
    }
  };

  // Handle refresh button click - simply reload the local data
  const handleRefresh = async () => {
    try {
      toast({
        title: "Processing...",
        description: "Reloading teacher data...",
      });

      // Simply reload the local teacher data
      await loadTeachersFromJson();

      // Show success toast
      toast({
        title: "Success",
        description: `Teacher data refreshed. Found ${localTeachers.length} teachers.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh teacher data",
        variant: "destructive",
      });
    }
  };

  // Load teachers from JSON on component mount
  useEffect(() => {
    loadTeachersFromJson();
  }, []);

  // Use local teachers data
  const displayTeachers = localTeachers;

  // Load attendance from local storage on mount and date change
  useEffect(() => {
    const storedData = localStorage.getItem(`attendance_${selectedDate.toISOString().split('T')[0]}`);
    if (storedData) {
      setLocalAttendance(JSON.parse(storedData));
    } else {
      const initialAttendance: Record<number, string> = {};
      teachers?.forEach(teacher => {
        initialAttendance[teacher.id] = 'present';
      });
      setLocalAttendance(initialAttendance);
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(initialAttendance)
      );
    }
  }, [selectedDate, teachers]);

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      teacherId,
      status,
    }: {
      teacherId: number;
      status: string;
    }) => {
      // Update local storage only
      const newLocalAttendance = {
        ...localAttendance,
        [teacherId]: status,
      };
      localStorage.setItem(
        `attendance_${selectedDate.toISOString().split('T')[0]}`,
        JSON.stringify(newLocalAttendance)
      );
      setLocalAttendance(newLocalAttendance);

      // Update absent teachers in local storage
      await updateAbsentTeachersFile(teacherId, status);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Attendance marked",
        description: "Teacher attendance has been updated locally.",
      });
    },
    onError: (error: Error) => {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance locally.",
        variant: "destructive",
      });
    },
  });

  const updateAbsentTeachersFile = async (teacherId: number, status: string) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get existing data from localStorage only
      let absentTeachers: Array<{
        teacherId: number;
        teacherName: string;
        phoneNumber?: string;
        date: string;
        periods: Array<{ period: number; className: string }>;
      }> = [];

      const existingData = localStorage.getItem('absent_teacher_for_substitute');
      if (existingData) {
        absentTeachers = JSON.parse(existingData);
      }

      if (status === 'absent') {
        // Add teacher to absent list if not already present
        const teacher = localTeachers.find(t => t.id === teacherId);
        if (!teacher) return;

        // Check if teacher is already in the list for this date
        const existingIndex = absentTeachers.findIndex(
          t => t.teacherId === teacherId && t.date === dateStr
        );

        if (existingIndex === -1) {
          absentTeachers.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            phoneNumber: teacher.phoneNumber,
            date: dateStr,
            periods: [] // Empty periods array for now
          });
        }
      } else {
        // Remove teacher from absent list
        absentTeachers = absentTeachers.filter(
          t => !(t.teacherId === teacherId && t.date === dateStr)
        );
      }

      // Save updated list to localStorage only
      localStorage.setItem('absent_teacher_for_substitute', JSON.stringify(absentTeachers, null, 2));
      
      console.log(`Updated absent teachers list in localStorage: ${absentTeachers.length} entries`);
    } catch (error) {
      console.error('Error updating absent teachers in localStorage:', error);
    }
  };

  const handleExportToExcel = () => {
    try {
      const monthName = selectedDate.toLocaleString('default', { month: 'long' });
      const year = selectedDate.getFullYear();

      // Create a CSV string
      let csvContent = `Teacher Attendance - ${monthName} ${year}\n\n`;

      // Add headers - days of month
      csvContent += "Teacher Name,";
      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        csvContent += `${i},`;
      }
      csvContent += "Total Present,Total Absent\n";

      // Add data for each teacher
      teachers?.forEach(teacher => {
        csvContent += `${teacher.name},`;

        let presentCount = 0;
        let absentCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const storageKey = `attendance_${dateStr}`;
          const attendanceData = localStorage.getItem(storageKey);

          if (attendanceData) {
            const attendance = JSON.parse(attendanceData);
            const status = attendance[teacher.id] || 'present';

            if (status === 'present') {
              csvContent += 'P,';
              presentCount++;
            } else {
              csvContent += 'A,';
              absentCount++;
            }
          } else {
            csvContent += ','; // No data for this day
          }
        }

        csvContent += `${presentCount},${absentCount}\n`;
      });

      // Save the CSV file
      const fileName = `attendance_${monthName}_${year}.csv`;
      localStorage.setItem(`attendance_excel_${monthName}_${year}`, csvContent);

      // Create a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting attendance to Excel:', error);
    }
  };


  if (teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-sm space-y-4">
        <h1 className="text-3xl font-bold text-center">Teacher Attendance</h1>

        <div className="flex justify-center items-center gap-2 py-2">
          <div className="px-4 py-2 bg-primary/10 rounded-md">
            <span className="text-sm font-medium text-primary">Total Teachers:</span>
            <span className="text-sm font-bold text-primary ml-2">{displayTeachers?.length || 0}</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefresh}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-center sm:text-left">
            Mark and track teacher attendance
          </p>
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleExportToExcel}>Export to Excel</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTeachers?.map((teacher) => {
          const status = localAttendance[teacher.id] || 'present';
          const isAbsent = status === 'absent';
          const isPending = markAttendanceMutation.isPending;

          return (
            <Card
              key={teacher.id}
              className={`relative cursor-pointer transition-colors ${
                isPending ? 'opacity-50' : ''
              } ${
                isAbsent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                if (!isPending) {
                  markAttendanceMutation.mutate({
                    teacherId: teacher.id,
                    status: isAbsent ? 'present' : 'absent',
                  });
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{teacher.name}</h3>
                  {teacher.phoneNumber && (
                    <span className="text-sm text-muted-foreground">
                      📱 {teacher.phoneNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isAbsent ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isAbsent ? 'Absent' : 'Present'}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${
                    isAbsent ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}