import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"

export default function Attendees() {
  const [date, setDate] = useState<Date>(new Date())
  const [totalTeachers] = useState(0) // This will be replaced with actual data later

  const handleExportToExcel = () => {
    // TODO: Implement export functionality
    console.log("Export to Excel clicked")
  }

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log("Refresh clicked")
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teacher Attendance</h1>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="bg-blue-50 p-3 rounded-md mb-4 w-fit">
          <span className="text-blue-600">Total Teachers: </span>
          <span className="font-bold">{totalTeachers}</span>
        </div>

        <p className="text-gray-600 mb-6">Mark and track teacher attendance</p>

        <div className="flex gap-4 w-full justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "MMMM do, yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleExportToExcel}>Export to csv</Button>
        </div>
      </div>

      {/* Teacher list will be added here */}
    </div>
  )
}