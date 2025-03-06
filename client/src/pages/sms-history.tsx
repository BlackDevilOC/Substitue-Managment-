
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SmsHistoryPage() {
  const { toast } = useToast();
  const [smsHistory, setSmsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // Load SMS history from localStorage
    const loadSmsHistory = () => {
      try {
        const storedHistory = localStorage.getItem('smsHistory');
        if (storedHistory) {
          setSmsHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        console.error("Failed to load SMS history:", error);
        toast({
          title: "Error",
          description: "Failed to load SMS history",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSmsHistory();
  }, [toast]);

  const handleResend = async (sms: any) => {
    try {
      // In a real app, this would call an API
      toast({
        title: "SMS Resent",
        description: "Message has been resent successfully.",
      });
      
      // Update the SMS history with a new entry
      const newEntry = {
        ...sms,
        id: Date.now(),
        sentAt: new Date().toISOString(),
      };
      
      const updatedHistory = [newEntry, ...smsHistory];
      localStorage.setItem('smsHistory', JSON.stringify(updatedHistory));
      setSmsHistory(updatedHistory);
    } catch (error) {
      toast({
        title: "Failed to Resend",
        description: "Could not resend the message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredSmsHistory = smsHistory
    .filter(sms => {
      const matchesSearch = sms.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           sms.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || sms.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return (
    <div className="container py-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SMS History</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            const updatedHistory = [...smsHistory];
            localStorage.setItem('smsHistory', JSON.stringify(updatedHistory));
            setSmsHistory(updatedHistory);
            toast({
              title: "History Refreshed",
              description: "SMS history has been refreshed.",
            });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by teacher or message content..."
            className="pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading SMS history...</p>
        </div>
      ) : filteredSmsHistory.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No SMS history found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all" ? 
              "Try adjusting your search or filters" : 
              "Start sending messages to build your history"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSmsHistory.map((sms: any) => (
            <Card key={sms.id} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>To: {sms.teacherName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sms.status === 'sent' ? 'bg-green-100 text-green-800' :
                      sms.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sms.status.charAt(0).toUpperCase() + sms.status.slice(1)}
                    </span>
                  </CardTitle>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(sms.sentAt), 'PPpp')}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResend(sms)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Resend
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-3 rounded-md mt-2">
                  <pre className="whitespace-pre-wrap text-sm">{sms.message}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

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