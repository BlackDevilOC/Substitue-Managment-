import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const CLASSES = ["10a", "10b", "10c", "9a", "9b", "9c", "8a", "8b", "8c", "7a", "7b", "7c", "6a", "6b", "6c"];

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  const { data: periodSchedules, isLoading: loadingPeriodSchedules } = useQuery({
    queryKey: ["/api/period-schedules"],
    queryFn: async () => {
      const res = await fetch('/api/period-schedules');
      if (!res.ok) throw new Error('Failed to fetch period schedules');
      return res.json();
    }
  });

  if (loadingPeriodSchedules) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get the schedule for the selected day
  const daySchedule = periodSchedules?.[selectedDay] || {};

  // Get available periods based on the day
  const availablePeriods = selectedDay === 'friday' ? PERIODS.slice(0, 5) : PERIODS;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-bold">Class Schedule</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map(day => (
                <SelectItem key={day} value={day}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedPeriod.toString()} 
            onValueChange={(value) => setSelectedPeriod(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(period => (
                <SelectItem key={period} value={period.toString()}>
                  Period {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Show only selected period */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mb-4 border-2 border-accent shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">
                {selectedPeriod}
              </span>
              <span>Period {selectedPeriod}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {CLASSES.map(className => {
                const periodData = daySchedule[selectedPeriod] || [];
                const classSchedule = periodData.find(
                  (s: any) => s.className.toLowerCase() === className.toLowerCase()
                );
                const teacherName = classSchedule?.teacherName || "No teacher";

                return (
                  <motion.div
                    key={className}
                    whileHover={{ scale: 1.02 }}
                    className="bg-background rounded-lg p-4 border-2 border-border shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="font-medium text-base mb-2">{className.toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 h-10">
                      {teacherName}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}