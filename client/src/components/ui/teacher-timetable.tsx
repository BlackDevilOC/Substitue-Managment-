
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TeacherTimetableProps {
  teacherName: string;
  onToggle: () => void;
  isOpen: boolean;
}

export default function TeacherTimetable({ 
  teacherName, 
  isOpen,
  onToggle
}: TeacherTimetableProps) {
  const [currentDay, setCurrentDay] = useState<string>(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    return today === 'sunday' ? 'monday' : today;
  });
  
  const { data: timetableData, isLoading } = useQuery({
    queryKey: [`teacher-schedule-${teacherName}`],
    queryFn: async () => {
      const response = await fetch(`/api/teacher-schedule/${encodeURIComponent(teacherName)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch teacher schedule");
      }
      return response.json();
    },
    enabled: isOpen,
  });
  
  const daySchedule = timetableData?.filter((item: any) => item.day === currentDay) || [];
  
  if (!isOpen) return null;
  
  return (
    <div className="mt-2 border rounded-md bg-card p-2 animate-in fade-in">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-sm">Today's Schedule ({format(new Date(), "EEEE")})</div>
        <div className="flex space-x-2">
          <select
            value={currentDay}
            onChange={(e) => setCurrentDay(e.target.value)}
            className="text-xs py-1 px-2 border rounded-md"
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : daySchedule.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 text-xs">
          {daySchedule
            .sort((a: any, b: any) => a.period - b.period)
            .map((item: any, i: number) => (
              <div key={i} className="border rounded-md p-1.5 bg-background">
                <div className="font-semibold">Period {item.period}</div>
                <div>{item.className}</div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground p-2">
          No schedule found for this day
        </div>
      )}
    </div>
  );
}
