import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export default function SmsHistoryPage() {
  const { toast } = useToast();

  const { data: smsHistory, isLoading } = useQuery({
    queryKey: ['smsHistory'],
    queryFn: async () => {
      const res = await fetch('/api/sms-history');
      if (!res.ok) throw new Error('Failed to fetch SMS history');
      return res.json();
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (sms: any) => {
      const res = await fetch('/api/resend-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sms.id, teacherId: sms.teacherId, message: sms.message })
      });
      if (!res.ok) throw new Error('Failed to resend SMS');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsHistory'] });
      toast({
        title: "SMS Resent",
        description: "Message has been resent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Resend",
        description: "Could not resend the message. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">SMS History</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">SMS History</h1>
      <div className="grid gap-4">
        {smsHistory?.map((sms: any) => (
          <Card key={sms.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">
                To: {sms.teacherName}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => resendMutation.mutate(sms)}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Resend
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{sms.message}</pre>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Sent: {format(new Date(sms.sentAt), 'PPpp')}</div>
                <div className="mt-1">
                  Status: <span className={`capitalize ${
                    sms.status === 'sent' ? 'text-green-600' :
                    sms.status === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>{sms.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}