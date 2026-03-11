import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;

function log(message: string, source = "websocket") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function setupRealtime(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws) => {
        log("New client connected");

        ws.on("error", (err) => {
            log(`WebSocket error: ${err.message}`);
        });

        ws.on("close", () => {
            log("Client disconnected");
        });
    });

    return wss;
}

export function broadcast(message: any) {
    if (!wss) return;

    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
