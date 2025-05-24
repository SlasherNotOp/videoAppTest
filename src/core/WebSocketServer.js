import { WebSocketServer as WSS } from "ws";
import { JwtUtil } from "../utils/JwtUtil.js";
import { AuthController } from "../controllers/AuthController.js";

export class WebSocketServer {
  constructor(server) {
    this.clients = new Map();
    this.jwt = new JwtUtil();
    this.wss = new WSS({ server });
    this.init();
  }

  init() {
    this.wss.on("connection", (ws) => {
      ws.on("message", async (message) => {
        let data;
        try {
          data = JSON.parse(message);
        } catch {
          return;
        }

        const { type, token, payload } = data;

        if (["LOGIN", "REGISTER"].includes(type)) {
          const auth = new AuthController(ws);
          await auth.handle(type, payload);
          return;
        }

        const user = this.jwt.verify(token);
        if (!user) return ws.send(JSON.stringify({ type: "UNAUTHORIZED" }));

        if (type === "JOIN_ROOM") {
          this.clients.set(ws, { userId: user.id, roomId: payload.roomId });
          ws.send(JSON.stringify({ type: "JOINED_ROOM", roomId: payload.roomId }));
          this.broadcast(payload.roomId, {
            type: "USER_JOINED",
            userId: user.id,
          }, ws);
        }

        if (type === "SIGNAL") {
          this.broadcast(payload.roomId, {
            type: "SIGNAL",
            from: user.id,
            signal: payload.signal,
          }, ws);
        }
      });

      ws.on("close", () => {
        const meta = this.clients.get(ws);
        if (meta) {
          this.broadcast(meta.roomId, {
            type: "USER_LEFT",
            userId: meta.userId,
          });
          this.clients.delete(ws);
        }
      });
    });
  }

  broadcast(roomId, message, excludeWs = null) {
    for (const [client, meta] of this.clients.entries()) {
      if (meta.roomId === roomId && client !== excludeWs) {
        client.send(JSON.stringify(message));
      }
    }
  }
}
