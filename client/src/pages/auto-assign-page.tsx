
import { useState } from "react";
import { apiRequest } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AutoAssignPage() {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [assignmentResults, setAssignmentResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json();
    },
  });

  // Days of the week
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleAssign = async () => {
    if (!selectedTeacher || !selectedDay) {
      setError("Please select both a teacher and a day");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace this with your actual API endpoint for assignments
      const response = await apiRequest("POST", "/api/assign-substitute", {
        teacherName: selectedTeacher,
        day: selectedDay.toLowerCase(),
      });
      
      const data = await response.json();
      setAssignmentResults(data);
    } catch (err) {
      setError("Failed to assign substitutes. Please try again.");
      console.error("Assignment error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle>Auto Assign Substitutes</CardTitle>
          <CardDescription>
            Select a teacher and day to automatically assign substitutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teacher Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Absent Teacher</label>
                <Select
                  value={selectedTeacher}
                  onValueChange={setSelectedTeacher}
                  disabled={teachersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachersLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading teachers...
                      </SelectItem>
                    ) : (
                      teachers?.map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.name}>
                          {teacher.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Day Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Day</label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleAssign} 
              disabled={isLoading || !selectedTeacher || !selectedDay}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...
                </>
              ) : (
                "Assign Substitutes"
              )}
            </Button>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Results Table */}
          {assignmentResults && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Assignment Results</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Original Teacher</TableHead>
                    <TableHead>Substitute</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(assignmentResults.assignments || {}).length > 0 ? (
                    Object.entries(assignmentResults.assignments || {}).map(([key, assignment]: [string, any]) => (
                      <TableRow key={key}>
                        <TableCell>{assignment.period}</TableCell>
                        <TableCell>{assignment.className}</TableCell>
                        <TableCell>{assignment.originalTeacher}</TableCell>
                        <TableCell>{assignment.substitute}</TableCell>
                        <TableCell>{assignment.substitutePhone || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
