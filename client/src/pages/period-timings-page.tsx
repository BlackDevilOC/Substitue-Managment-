
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function PeriodTimingsPage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);

  const { data: timings = [] } = useQuery({
    queryKey: ["/api/period-timings"],
    queryFn: async () => {
      const res = await fetch("/api/period-timings");
      if (!res.ok) throw new Error("Failed to fetch timings");
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/period-timings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update timings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/period-timings"] });
      setEditMode(false);
      toast({ title: "Success", description: "Period timings updated" });
    }
  });

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Period Timings</h1>
        <Button onClick={() => setEditMode(!editMode)}>
          {editMode ? "Cancel" : "Edit Timings"}
        </Button>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 8 }).map((_, i) => {
          const timing = timings.find((t: any) => t.period === i + 1);
          return (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Period {i + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Start Time</label>
                    <Input
                      type="time"
                      value={timing?.startTime || ""}
                      onChange={(e) => {
                        if (editMode) {
                          updateMutation.mutate({
                            period: i + 1,
                            startTime: e.target.value,
                            endTime: timing?.endTime || ""
                          });
                        }
                      }}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <label className="text-sm">End Time</label>
                    <Input
                      type="time"
                      value={timing?.endTime || ""}
                      onChange={(e) => {
                        if (editMode) {
                          updateMutation.mutate({
                            period: i + 1,
                            startTime: timing?.startTime || "",
                            endTime: e.target.value
                          });
                        }
                      }}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
