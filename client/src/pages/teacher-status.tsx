
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

interface TeacherStatus {
  id: number;
  name: string;
  status: 'in_class' | 'available' | 'absent';
  currentClass?: string;
}

export default function TeacherStatusPage() {
  const { data: teachers = [] } = useQuery({
    queryKey: ["/api/teachers"],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ["/api/absences"],
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["/api/schedule"],
  });

  const getTeacherStatus = (teacherId: number): TeacherStatus['status'] => {
    if (absences.some((a: any) => a.teacherId === teacherId)) {
      return 'absent';
    }
    if (schedule.some((s: any) => s.teacherId === teacherId)) {
      return 'in_class';
    }
    return 'available';
  };

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Teacher Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {teachers.map((teacher: any) => {
              const status = getTeacherStatus(teacher.id);
              return (
                <div 
                  key={teacher.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="font-medium">{teacher.name}</div>
                  <div>
                    {status === 'in_class' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        In Class
                      </span>
                    )}
                    {status === 'available' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Available
                      </span>
                    )}
                    {status === 'absent' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        Absent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
