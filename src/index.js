import http from "http";
import express from "express";
import { PORT } from "./config/env.js";
import { WebSocketServer } from "./core/WebSocketServer.js";

const app = express();
const server = http.createServer(app);

new WebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
