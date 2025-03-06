import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function SMSHistoryPage() {
  const { toast } = useToast();

  const { data: smsHistory, isLoading } = useQuery({
    queryKey: ['smsHistory'],
    queryFn: async () => {
      const response = await fetch('/api/sms/history');
      if (!response.ok) {
        throw new Error('Failed to fetch SMS history');
      }
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sms/history/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete SMS record');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsHistory'] });
      toast({
        title: 'SMS record deleted',
        description: 'The SMS record has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete SMS record: ${error}`,
      });
    },
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredSMS = smsHistory?.filter((sms: any) => 
    sms.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sms.phoneNumber?.includes(searchTerm) ||
    sms.message?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading SMS history...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SMS History</h1>

      <div className="mb-4">
        <Input
          placeholder="Search by teacher, phone, or message content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableCaption>A list of all SMS messages sent</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSMS.length > 0 ? (
            filteredSMS.map((sms: any) => (
              <TableRow key={sms.id}>
                <TableCell>{new Date(sms.timestamp).toLocaleString()}</TableCell>
                <TableCell>{sms.teacherName}</TableCell>
                <TableCell>{sms.phoneNumber}</TableCell>
                <TableCell className="max-w-xs truncate">{sms.message}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    sms.status === 'sent' ? 'bg-green-100 text-green-800' :
                    sms.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sms.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteMutation.mutate(sms.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                {searchTerm ? 'No matching SMS records found' : 'No SMS records available'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}