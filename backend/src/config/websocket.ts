import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function setupWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware for WebSocket
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.data.userId}`);

    // Join user-specific room
    socket.join(`user:${socket.data.userId}`);

    // Join organization room
    socket.on('join:organization', (orgId: string) => {
      socket.join(`org:${orgId}`);
    });

    // Join conversation room
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.data.userId}`);
    });
  });

  return io;
}

// Helper to emit events
export function emitToUser(io: Server, userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(io: Server, conversationId: string, event: string, data: unknown) {
  io.to(`conversation:${conversationId}`).emit(event, data);
}

export function emitToOrganization(io: Server, orgId: string, event: string, data: unknown) {
  io.to(`org:${orgId}`).emit(event, data);
}
