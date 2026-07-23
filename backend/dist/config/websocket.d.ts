import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export declare function setupWebSocket(httpServer: HttpServer): Server;
export declare function emitToUser(io: Server, userId: string, event: string, data: unknown): void;
export declare function emitToConversation(io: Server, conversationId: string, event: string, data: unknown): void;
export declare function emitToOrganization(io: Server, orgId: string, event: string, data: unknown): void;
//# sourceMappingURL=websocket.d.ts.map