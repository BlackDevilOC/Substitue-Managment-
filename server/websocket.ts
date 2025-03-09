import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { notifications } from '../shared/schema';
import { db } from './db';

interface ConnectedClient {
  ws: WebSocket;
  teacherId: number;
}

class NotificationServer {
  private wss: WebSocketServer;
  private clients: Map<number, ConnectedClient>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'authenticate') {
          this.authenticateClient(ws, data.teacherId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      this.removeClient(ws);
    });
  }

  private authenticateClient(ws: WebSocket, teacherId: number) {
    this.clients.set(teacherId, { ws, teacherId });
  }

  private removeClient(ws: WebSocket) {
    for (const [teacherId, client] of this.clients.entries()) {
      if (client.ws === ws) {
        this.clients.delete(teacherId);
        break;
      }
    }
  }

  public async sendNotification(notification: typeof notifications.$inferInsert) {
    try {
      // Store notification in database
      await db.insert(notifications).values(notification);

      // Send to specific recipient if online
      const client = this.clients.get(notification.recipientId);
      if (client) {
        client.ws.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  public async broadcastNotification(
    notification: Omit<typeof notifications.$inferInsert, 'recipientId'>,
    recipientIds: number[]
  ) {
    for (const recipientId of recipientIds) {
      await this.sendNotification({ ...notification, recipientId });
    }
  }
}

let notificationServer: NotificationServer;

export function initializeWebSocket(server: Server) {
  notificationServer = new NotificationServer(server);
  return notificationServer;
}

export function getNotificationServer() {
  if (!notificationServer) {
    throw new Error('WebSocket server not initialized');
  }
  return notificationServer;
}
