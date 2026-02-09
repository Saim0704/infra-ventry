import { useQuery } from "@tanstack/react-query";
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
    refetchInterval: 5000, // Faster refresh for live metrics
  });
}
