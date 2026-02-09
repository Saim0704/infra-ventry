import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Server = z.infer<typeof api.servers.list.responses[200]>[number];
type ServerDetail = z.infer<typeof api.servers.get.responses[200]>;

export function useServers() {
  return useQuery<Server[]>({
    queryKey: [api.servers.list.path],
    queryFn: async () => {
      const res = await fetch(api.servers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch servers");
      return api.servers.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000,
  });
}

export function useServer(id: number | null) {
  return useQuery<ServerDetail | null>({
    queryKey: [api.servers.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.servers.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch server details");
      return api.servers.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateServer() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.servers.create.input>) => {
      const res = await fetch(api.servers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create server");
      return api.servers.create.responses[201].parse(await res.json());
    },
  });
}

export function useUpdateServer() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof api.servers.update.input> }) => {
      const url = buildUrl(api.servers.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update server");
      return api.servers.update.responses[200].parse(await res.json());
    },
  });
}

export function useDeleteServer() {
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.servers.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete server");
    },
  });
}
