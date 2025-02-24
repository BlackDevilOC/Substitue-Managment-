import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, UserPlus, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeacherSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SubstitutesPage() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertTeacherSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      isSubstitute: true,
    },
  });

  const { data: substitutes, isLoading: loadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["/api/absences"],
  });

  const addSubstituteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add substitute");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      form.reset();
      toast({
        title: "Success",
        description: "Substitute teacher added successfully",
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
    addSubstituteMutation.mutate(data);
  };

  const isLoading = loadingTeachers || loadingAbsences;
  const today = format(new Date(), "yyyy-MM-dd");

  // Get substitute teachers and check their availability
  const substituteTeachers = substitutes?.filter(t => t.isSubstitute) || [];
  const substituteStatuses = substituteTeachers.map(substitute => {
    const isAbsentToday = absences?.some(
      absence => 
        absence.teacherId === substitute.id && 
        format(new Date(absence.date), "yyyy-MM-dd") === today
    );
    const isAssignedToday = absences?.some(
      absence => 
        absence.substituteId === substitute.id && 
        format(new Date(absence.date), "yyyy-MM-dd") === today
    );

    return {
      ...substitute,
      status: isAbsentToday ? "Absent" : isAssignedToday ? "Assigned" : "Available"
    };
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Substitute Teachers</h1>

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

            <Button 
              type="submit" 
              disabled={addSubstituteMutation.isPending}
              className="w-full"
            >
              {addSubstituteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Add Substitute
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Substitutes</h2>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {substituteStatuses.map(substitute => (
              <Card key={substitute.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{substitute.name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 mr-2" />
                        {substitute.phoneNumber || "No phone number"}
                      </div>
                      <div className={`flex items-center mt-2 text-sm ${
                        substitute.status === "Available" ? "text-green-600" :
                        substitute.status === "Assigned" ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {substitute.status}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}