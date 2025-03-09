import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export function useNotifications(teacherId?: number) {
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch existing notifications
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const response = await fetch(`/api/notifications?teacherId=${teacherId}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!teacherId
  });

  const connect = useCallback(() => {
    if (!teacherId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      // Authenticate the connection
      ws.current?.send(JSON.stringify({
        type: 'authenticate',
        teacherId
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          // Update notifications cache
          queryClient.setQueryData(['/api/notifications', teacherId], 
            (old: Notification[] = []) => [data.data, ...old]
          );

          // Show toast notification
          toast({
            title: data.data.title,
            description: data.data.message,
          });
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    ws.current.onclose = () => {
      // Attempt to reconnect after a delay
      setTimeout(connect, 5000);
    };

    return () => {
      ws.current?.close();
    };
  }, [teacherId, toast, queryClient]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      ws.current?.close();
    };
  }, [connect]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to mark notification as read');
      
      // Update cache
      queryClient.setQueryData(['/api/notifications', teacherId], 
        (old: Notification[] = []) => 
          old.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [teacherId, queryClient]);

  return {
    notifications,
    markAsRead
  };
}
