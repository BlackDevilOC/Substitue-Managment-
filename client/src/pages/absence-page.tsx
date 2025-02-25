import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, UserMinus } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { insertAbsenceSchema } from "@shared/schema";

export default function AbsencePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const markAbsenceMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const absence = {
        teacherId,
        date: format(selectedDate, "yyyy-MM-dd"),
      };
      const parsed = insertAbsenceSchema.safeParse(absence);
      if (!parsed.success) throw new Error("Invalid absence data");
      
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Failed to mark absence");
      await queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      toast({
        title: "Success",
        description: "Teacher marked as absent",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingTeachers || loadingAbsences;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Manage Absences</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Teachers</h2>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {teachers?.map(teacher => {
                  const isAbsent = absences?.some(
                    a => a.teacherId === teacher.id &&
                    a.date === format(selectedDate, "yyyy-MM-dd")
                  );

                  return (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <span>{teacher.name}</span>
                      <Button
                        variant={isAbsent ? "destructive" : "outline"}
                        size="sm"
                        disabled={isAbsent || markAbsenceMutation.isPending}
                        onClick={() => markAbsenceMutation.mutate(teacher.id)}
                      >
                        {markAbsenceMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            {isAbsent ? "Absent" : "Mark Absent"}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
