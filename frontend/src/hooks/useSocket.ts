import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('join:conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('leave:conversation', conversationId);
  }, []);

  const onMessage = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on('new-message', callback);
    return () => { socketRef.current?.off('new-message', callback); };
  }, []);

  const onConversationUpdate = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on('conversation-updated', callback);
    return () => { socketRef.current?.off('conversation-updated', callback); };
  }, []);

  return { joinConversation, leaveConversation, onMessage, onConversationUpdate };
}
