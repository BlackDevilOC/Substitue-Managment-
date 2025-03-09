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
      const res = await fetch('/api/send-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers: [{
            id: sms.teacherId,
            name: sms.teacherName,
            phone: sms.phone
          }],
          message: sms.message,
          method: sms.method || 'api'
        })
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
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">SMS History</h1>
      <div className="grid gap-4">
        {smsHistory?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No SMS history found
            </CardContent>
          </Card>
        ) : (
          smsHistory?.map((sms: any) => (
            <Card key={sms.id} className="hover:shadow-md transition-shadow">
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
                <div className="space-y-2">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">{sms.message}</pre>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div>Sent: {format(new Date(sms.sentAt), 'PPpp')}</div>
                    <div className="flex items-center gap-2">
                      Method: <span className="capitalize">{sms.method}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sms.status === 'sent' ? 'bg-green-100 text-green-800' :
                        sms.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sms.status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}