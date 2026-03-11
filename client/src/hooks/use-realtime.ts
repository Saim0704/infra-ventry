import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("[WebSocket] Received:", message);

                if (message.type === "resource_update" || message.type === "metric_update") {
                    const { resource, id } = message;

                    if (resource === "server") {
                        queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
                        if (id) {
                            queryClient.invalidateQueries({ queryKey: [api.servers.get.path, id] });
                        }
                    } else if (resource === "database") {
                        queryClient.invalidateQueries({ queryKey: [api.databases.list.path] });
                        if (id) {
                            queryClient.invalidateQueries({ queryKey: [api.databases.get.path, id] });
                        }
                    } else if (resource === "cluster") {
                        queryClient.invalidateQueries({ queryKey: [api.clusters.list.path] });
                        if (id) {
                            queryClient.invalidateQueries({ queryKey: [api.clusters.get.path, id] });
                        }
                    }

                    // Also invalidate dashboard stats for any resource update
                    queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
                }
            } catch (err) {
                console.error("[WebSocket] Error parsing message:", err);
            }
        };

        socket.onopen = () => {
            console.log("[WebSocket] Connected to real-time updates");
        };

        socket.onclose = () => {
            console.log("[WebSocket] Disconnected from real-time updates");
        };

        return () => {
            socket.close();
        };
    }, [queryClient]);
}
