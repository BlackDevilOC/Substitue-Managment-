
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AssignSubstitute() {
  const { className, period } = useParams();
  const navigate = useNavigate();

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get('/api/teachers').then(res => res.data)
  });

  const { data: schedule } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get('/api/schedule').then(res => res.data)
  });

  const availableTeachers = React.useMemo(() => {
    if (!teachers || !schedule) return [];
    
    return teachers.filter(teacher => {
      const hasClassAtPeriod = schedule.some(s => 
        s.teacherId === teacher.id && 
        s.period === parseInt(period || "0")
      );
      return !hasClassAtPeriod;
    });
  }, [teachers, schedule, period]);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assign Substitute</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class {className} - Period {period}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-medium">Available Teachers:</h3>
            <div className="grid grid-cols-2 gap-4">
              {availableTeachers.map(teacher => (
                <div key={teacher.id} className="p-4 border rounded-lg">
                  <div className="font-medium">{teacher.name}</div>
                  <Button 
                    className="mt-2" 
                    onClick={() => {
                      // Handle assignment here
                      navigate('/manage-absences');
                    }}
                  >
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
