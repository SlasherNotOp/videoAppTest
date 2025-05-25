import http from "http";
import express from "express";
import { PORT } from "./config/env.js";
import { WebSocketServer } from "./core/WebSocketServer.js";
import authRoutes from "./routes/auth.js";
import cors from 'cors'


const app = express();
const server = http.createServer(app);

new WebSocketServer(server);

app.use(express.json());
app.use(cors())
app.use("/api/auth", authRoutes);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
