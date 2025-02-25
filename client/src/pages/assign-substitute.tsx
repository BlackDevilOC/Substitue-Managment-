
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AssignSubstitutePage() {
  const { classId } = useParams();
  
  const { data: schedule } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const { data: teachers } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const classInfo = schedule?.find(s => s.id === parseInt(classId || "0"));
  const teacher = teachers?.find(t => t.id === classInfo?.teacherId);
  const availableSubstitutes = teachers?.filter(t => t.isSubstitute) || [];

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Substitute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Class Details</h3>
              <p className="text-sm text-muted-foreground">
                {classInfo?.className} - Period {classInfo?.period}
              </p>
              <p className="text-sm text-muted-foreground">
                Absent Teacher: {teacher?.name}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Available Substitutes</h3>
              <div className="space-y-2">
                {availableSubstitutes.map(substitute => (
                  <Button
                    key={substitute.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Handle substitute assignment
                    }}
                  >
                    {substitute.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
