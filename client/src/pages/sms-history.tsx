
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function SmsHistoryPage() {
  const { data: smsHistory } = useQuery({
    queryKey: ['smsHistory'],
    queryFn: async () => {
      const res = await fetch('/api/sms-history');
      if (!res.ok) throw new Error('Failed to fetch SMS history');
      return res.json();
    }
  });

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">SMS History</h1>
      <div className="grid gap-4">
        {smsHistory?.map((sms: any) => (
          <Card key={sms.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                To: {sms.teacherName}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {format(new Date(sms.sentAt), 'PPpp')}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{sms.message}</pre>
              <div className="mt-2 text-sm">
                Status: <span className="capitalize">{sms.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
