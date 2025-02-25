import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';

export default function ManageAbsences() {
  const navigate = useNavigate();
  const { data: schedule } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get('/api/schedule').then(res => res.data)
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get('/api/teachers').then(res => res.data)
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => api.get('/api/absences').then(res => res.data)
  });

  const currentClasses = React.useMemo(() => {
    if (!schedule || !teachers || !absences) return [];
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return schedule.map(s => {
      const teacher = teachers.find(t => t.id === s.teacherId);
      const isAbsent = absences.some(
        a => a.teacherId === teacher?.id && 
        format(new Date(a.date), "yyyy-MM-dd") === todayStr
      );

      return {
        period: s.period,
        className: s.className,
        teacher: teacher?.name || "No teacher",
        isAbsent,
        teacherId: teacher?.id
      };
    });
  }, [schedule, teachers, absences]);

  const exportReport = () => {
    const report = {
      date: new Date().toLocaleDateString(),
      classes: currentClasses
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${report.date}.json`;
    a.click();
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Absences</h1>
        <Button onClick={exportReport} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Classes Needing Substitutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {currentClasses.map((c) => (
                <div 
                  key={`${c.period}-${c.className}`}
                  className={`p-4 rounded-lg border cursor-pointer ${c.isAbsent ? 'bg-red-50 border-red-200' : ''}`}
                  onClick={() => navigate(`/assign-substitute/${c.className}/${c.period}`)}
                >
                  <div className="font-medium">{c.className}</div>
                  <div className="text-sm text-muted-foreground">
                    Period {c.period}
                  </div>
                  <div className={c.isAbsent ? 'text-red-500' : ''}>
                    {c.isAbsent ? 'Teacher Absent' : c.teacher}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Substitutes</CardTitle>
          </CardHeader>
          <CardContent>
            {currentClasses.filter(c => c.isAbsent).length === 0 ? (
              <p className="text-muted-foreground">No substitutes assigned yet</p>
            ) : (
              <div className="space-y-4">
                {currentClasses.filter(c => c.isAbsent).map((c) => {
                  const substitute = teachers?.find(t => 
                    schedule?.find(s => 
                      s.className === c.className && 
                      s.period === c.period
                    )?.substituteId === t.id
                  );

                  return (
                    <div key={`${c.period}-${c.className}`} className="p-4 border rounded-lg">
                      <div className="font-medium">{c.className}</div>
                      <div className="text-sm text-muted-foreground">
                        Period {c.period}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-1">
                        {substitute ? `Substitute: ${substitute.name}` : 'No substitute assigned'}
                      </div>
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