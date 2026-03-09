import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type WebMonitor = z.infer<typeof api.webMonitors.list.responses[200]>[number];
type WebMonitorDetail = z.infer<typeof api.webMonitors.get.responses[200]>;

export function useWebMonitors() {
    return useQuery<WebMonitor[]>({
        queryKey: [api.webMonitors.list.path],
        queryFn: async () => {
            const res = await fetch(api.webMonitors.list.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch web monitors");
            return api.webMonitors.list.responses[200].parse(await res.json());
        },
        refetchInterval: 10000,
    });
}

export function useWebMonitor(id: number | null) {
    return useQuery<WebMonitorDetail | null>({
        queryKey: [api.webMonitors.get.path, id],
        queryFn: async () => {
            if (!id) return null;
            const url = buildUrl(api.webMonitors.get.path, { id });
            const res = await fetch(url, { credentials: "include" });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error("Failed to fetch web monitor details");
            return api.webMonitors.get.responses[200].parse(await res.json());
        },
        enabled: !!id,
        refetchInterval: 5000,
    });
}

export function useDeleteWebMonitor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(api.webMonitors.delete.path.replace(":id", String(id)), {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete web monitor");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
        },
    });
}
