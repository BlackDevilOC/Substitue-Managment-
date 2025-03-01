
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export default function AutoAssignPage() {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [assignmentResults, setAssignmentResults] = useState<any>(null);
  const { toast } = useToast();

  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("Failed to load teachers");
      return res.json();
    }
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacher) {
        throw new Error("Please select a teacher");
      }
      
      const response = await fetch("/api/assign-substitute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherName: selectedTeacher,
          day: selectedDay,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign substitutes");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAssignmentResults(data);
      toast({
        title: "Success",
        description: "Substitutes assigned successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

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
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Button 
                onClick={() => assignMutation.mutate()}
                disabled={!selectedTeacher || assignMutation.isPending}
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Substitutes"
                )}
              </Button>
            </div>
          </div>

          {/* Results Display */}
          {assignmentResults && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Assignment Results</h3>
              
              {Object.keys(assignmentResults.assignments).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-4 py-2 text-left font-medium">Period</th>
                        <th className="px-4 py-2 text-left font-medium">Class</th>
                        <th className="px-4 py-2 text-left font-medium">Original Teacher</th>
                        <th className="px-4 py-2 text-left font-medium">Substitute</th>
                        <th className="px-4 py-2 text-left font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(assignmentResults.assignments).map((assignment: any, index: number) => (
                        <tr key={index} className="border-b border-border">
                          <td className="px-4 py-2">{assignment.period}</td>
                          <td className="px-4 py-2">{assignment.className}</td>
                          <td className="px-4 py-2">{assignment.originalTeacher}</td>
                          <td className="px-4 py-2">{assignment.substitute}</td>
                          <td className="px-4 py-2">{assignment.substitutePhone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No assignments were made. The teacher might not have classes on this day.</p>
              )}
              
              {assignmentResults.verification && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Verification</h4>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(assignmentResults.verification, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            The system will automatically find the best substitute teachers based on availability.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
