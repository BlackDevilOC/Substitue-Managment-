import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SubstitutesPage() {
  const queryClient = useQueryClient();
  const form = useForm();

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return res.json();
    },
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
    queryFn: async () => {
      const res = await fetch("/api/absences");
      if (!res.ok) throw new Error("Failed to fetch absences");
      return res.json();
    },
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["/api/assignments"],
    queryFn: async () => {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  const addTeacherMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add teacher");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      form.reset();
      toast({
        title: "Success",
        description: "Teacher added successfully",
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

  const onSubmit = (data: any) => {
    addTeacherMutation.mutate(data);
  };

  const isLoading = loadingTeachers || loadingAbsences || loadingAssignments;
  const today = format(new Date(), "yyyy-MM-dd");

  const teacherStatuses = teachers?.map((teacher) => {
    const isAbsentToday = absences?.some(
      (absence) =>
        absence.teacherId === teacher.id &&
        format(new Date(absence.date), "yyyy-MM-dd") === today
    );
    const isAssignedToday = absences?.some(
      (absence) =>
        absence.substituteId === teacher.id &&
        format(new Date(absence.date), "yyyy-MM-dd") === today
    );

    return {
      ...teacher,
      status: isAbsentToday
        ? "Absent"
        : isAssignedToday
        ? "Assigned"
        : "Available",
    };
  }) || [];

  return (
    <div className="secondary-page container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Available Teachers</h1>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" {...form.register("phoneNumber")} />
              {form.formState.errors.phoneNumber && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phoneNumber.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading}>
              Add Teacher
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Teacher Status</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teacherStatuses.map((teacher) => (
                <div
                  key={teacher.id}
                  className={`p-4 rounded-lg border ${
                    teacher.status === "Available"
                      ? "bg-green-50 border-green-200"
                      : teacher.status === "Assigned"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="font-medium">{teacher.name}</div>
                  <div className="text-sm mt-1">
                    Status:{" "}
                    <span className="font-medium">{teacher.status}</span>
                  </div>
                  {teacher.phoneNumber && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Phone: {teacher.phoneNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignments?.map((assignment) => {
              const teacher = teachers?.find(t => t.id === assignment.absence.teacherId);
              const substitute = teachers?.find(t => t.id === assignment.substituteId);
              return (
                <div key={assignment.absence.id} className="p-4 border rounded-lg bg-success/5">
                  <div className="font-medium text-lg text-primary">{teacher?.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                      Period {assignment.absence.period}
                    </span>
                    <span className="text-sm font-medium text-success flex items-center">
                      <span className="mr-2">✓</span>
                      Covered by: {substitute?.name}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Class: {assignment.absence.className}
                  </div>
                </div>
              );
            })}
            {(!assignments || assignments.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No current assignments
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}