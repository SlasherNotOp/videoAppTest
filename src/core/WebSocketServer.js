import { WebSocketServer as WSS } from "ws";
import { JwtUtil } from "../utils/JwtUtil.js";
import { AuthController } from "../controllers/AuthController.js";

export class WebSocketServer {
  constructor(server) {
    this.clients = new Map(); // Map<WebSocket, {userId, roomId}>
    this.rooms = new Map(); // Map<roomId, Set<userId>>
    this.jwt = new JwtUtil();
    this.wss = new WSS({ server });
    this.init();
  }

  init() {
    this.wss.on("connection", (ws) => {
      console.log("New WebSocket connection");

      ws.on("message", async (message) => {
        let data;
        try {
          data = JSON.parse(message);
        } catch (error) {
          console.error("Invalid JSON:", error);
          return;
        }

        const { type, token, payload, from } = data;
        console.log("Received message:", { type, from, payload });

        // Handle authentication
        if (["LOGIN", "REGISTER"].includes(type)) {
          const auth = new AuthController(ws);
          await auth.handle(type, payload);
          return;
        }

        // Verify JWT token for protected routes
        const user = this.jwt.verify(token);
        if (!user) {
          console.log("Unauthorized access attempt");
          return ws.send(JSON.stringify({ type: "UNAUTHORIZED" }));
        }

        // Handle room joining
        if (type === "JOIN_ROOM") {
          const { roomId } = payload;
          
          // Store client metadata with unique session handling
          this.clients.set(ws, { userId: user.id, roomId });
          
          // Add user to room (allow multiple sessions per user)
          if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map()); // Map<userId, Set<WebSocket>>
          }
          
          const roomUsers = this.rooms.get(roomId);
          if (!roomUsers.has(user.id)) {
            roomUsers.set(user.id, new Set());
          }
          roomUsers.get(user.id).add(ws);

          // Confirm room join to the user
          ws.send(JSON.stringify({ 
            type: "JOINED_ROOM", 
            roomId,
            userId: user.id 
          }));

          // Notify other users in the room (broadcast to all sessions)
          this.broadcast(roomId, {
            type: "USER_JOINED",
            from: user.id,
            userId: user.id,
          }, ws);

          console.log(`User ${user.id} joined room ${roomId}`);
          console.log(`Room ${roomId} now has users:`, Array.from(roomUsers.keys()));
        }

        // Handle WebRTC signaling
        if (type === "SIGNAL") {
          const { roomId, to, signal } = payload;
          
          // If 'to' is specified, send to specific user, otherwise broadcast to room
          if (to) {
            this.sendToUser(to, {
              type: "SIGNAL",
              from: user.id,
              payload: { signal, roomId }
            });
          } else {
            this.broadcast(roomId, {
              type: "SIGNAL",
              from: user.id,
              payload: { signal, roomId }
            }, ws);
          }
          
          console.log(`Signal from ${user.id} to ${to || 'room'}`);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
        const clientData = this.clients.get(ws);
        
        if (clientData) {
          const { userId, roomId } = clientData;
          
          // Remove this specific WebSocket from room
          if (this.rooms.has(roomId)) {
            const roomUsers = this.rooms.get(roomId);
            if (roomUsers.has(userId)) {
              roomUsers.get(userId).delete(ws);
              
              // If user has no more active sessions, remove them completely
              if (roomUsers.get(userId).size === 0) {
                roomUsers.delete(userId);
                
                // Notify other users that this user left completely
                this.broadcast(roomId, {
                  type: "USER_LEFT",
                  userId,
                  from: userId
                });
              }
              
              // Clean up empty rooms
              if (roomUsers.size === 0) {
                this.rooms.delete(roomId);
              }
            }
          }
          
          // Remove client
          this.clients.delete(ws);
          
          console.log(`User ${userId} session disconnected from room ${roomId}`);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  // Send message to specific user
  sendToUser(userId, message) {
    for (const [client, meta] of this.clients.entries()) {
      if (meta.userId === userId && client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
        return true;
      }
    }
    return false;
  }

  // Broadcast message to all users in a room except sender
  broadcast(roomId, message, excludeWs = null) {
    let sentCount = 0;
    
    for (const [client, meta] of this.clients.entries()) {
      if (meta.roomId === roomId && 
          client !== excludeWs && 
          client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
        sentCount++;
      }
    }
    
    console.log(`Broadcasted to ${sentCount} clients in room ${roomId}`);
    return sentCount;
  }

  // Get active users in a room
  getRoomUsers(roomId) {
    const roomUsers = this.rooms.get(roomId);
    return roomUsers ? Array.from(roomUsers.keys()) : [];
  }

  // Get room statistics
  getRoomStats() {
    const stats = {};
    for (const [roomId, userMap] of this.rooms.entries()) {
      const users = Array.from(userMap.keys());
      const totalSessions = Array.from(userMap.values())
        .reduce((sum, sessions) => sum + sessions.size, 0);
      
      stats[roomId] = {
        userCount: users.length,
        sessionCount: totalSessions,
        users: users
      };
    }
    return stats;
  }
}