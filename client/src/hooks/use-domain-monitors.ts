import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type DomainMonitor = z.infer<typeof api.domainMonitors.list.responses[200]>[number];
type DomainMonitorDetail = z.infer<typeof api.domainMonitors.get.responses[200]>;

export function useDomainMonitors() {
    return useQuery<DomainMonitor[]>({
        queryKey: [api.domainMonitors.list.path],
        queryFn: async () => {
            const res = await fetch(api.domainMonitors.list.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch domain monitors");
            return api.domainMonitors.list.responses[200].parse(await res.json());
        },
        refetchInterval: 10000,
    });
}

export function useDomainMonitor(id: number | null) {
    return useQuery<DomainMonitorDetail | null>({
        queryKey: [api.domainMonitors.get.path, id],
        queryFn: async () => {
            if (!id) return null;
            const url = buildUrl(api.domainMonitors.get.path, { id });
            const res = await fetch(url, { credentials: "include" });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error("Failed to fetch domain monitor details");
            return api.domainMonitors.get.responses[200].parse(await res.json());
        },
        enabled: !!id,
        refetchInterval: 30000,
    });
}

export function useCreateDomainMonitor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: z.infer<typeof api.domainMonitors.create.input>) => {
            const res = await fetch(api.domainMonitors.create.path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create domain monitor");
            return api.domainMonitors.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.domainMonitors.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
        },
    });
}

export function useDeleteDomainMonitor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(api.domainMonitors.delete.path.replace(":id", String(id)), {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete domain monitor");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.domainMonitors.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
        },
    });
}
