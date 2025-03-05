
import React, { useState, useEffect } from "react";
import { format } from "date-fns";

interface TeacherScheduleEntry {
  day: string;
  period: number;
  className: string;
}

interface TeacherTimetableProps {
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherTimetable({ teacherName, isOpen, onClose }: TeacherTimetableProps) {
  const [schedule, setSchedule] = useState<TeacherScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState<string>("");

  useEffect(() => {
    if (isOpen && teacherName) {
      setLoading(true);
      // Get the current day of the week
      const today = new Date();
      const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      setCurrentDay(dayName);

      // Fetch the teacher's schedule from our JSON data
      fetch("/api/teacher-schedule/" + encodeURIComponent(teacherName.toLowerCase()))
        .then(response => response.json())
        .then(data => {
          setSchedule(data || []);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching teacher schedule:", error);
          setLoading(false);
        });
    }
  }, [isOpen, teacherName]);

  if (!isOpen) return null;

  // Filter schedule by day
  const todaySchedule = schedule.filter(entry => entry.day === currentDay);
  
  // Sort by period
  todaySchedule.sort((a, b) => a.period - b.period);

  return (
    <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 w-64">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{teacherName}'s Timetable</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-2">
        {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}
      </p>
      
      {loading ? (
        <div className="py-2 text-center">Loading...</div>
      ) : todaySchedule.length > 0 ? (
        <div className="space-y-1">
          {todaySchedule.map((entry, index) => (
            <div 
              key={index}
              className="flex justify-between items-center py-1 px-2 rounded-sm bg-gray-100 dark:bg-gray-700"
            >
              <span className="font-medium">Period {entry.period}</span>
              <span className="text-sm">{entry.className}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-2 text-center text-sm text-muted-foreground">
          No classes today
        </div>
      )}
    </div>
  );
}
