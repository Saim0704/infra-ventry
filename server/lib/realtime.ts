import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;

import { info, error as errLogger } from "./logger";

function log(message: string, source = "websocket") {
  info(message, source);
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
