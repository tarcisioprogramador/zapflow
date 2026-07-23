"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
exports.emitToUser = emitToUser;
exports.emitToConversation = emitToConversation;
exports.emitToOrganization = emitToOrganization;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function setupWebSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
        },
    });
    // Auth middleware for WebSocket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                return next(new Error('JWT_SECRET não configurado no servidor'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            socket.data.userId = decoded.userId;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.data.userId}`);
        // Join user-specific room
        socket.join(`user:${socket.data.userId}`);
        // Join organization room
        socket.on('join:organization', (orgId) => {
            socket.join(`org:${orgId}`);
        });
        // Join conversation room
        socket.on('join:conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });
        // Leave conversation room
        socket.on('leave:conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.data.userId}`);
        });
    });
    return io;
}
// Helper to emit events
function emitToUser(io, userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
}
function emitToConversation(io, conversationId, event, data) {
    io.to(`conversation:${conversationId}`).emit(event, data);
}
function emitToOrganization(io, orgId, event, data) {
    io.to(`org:${orgId}`).emit(event, data);
}
//# sourceMappingURL=websocket.js.map