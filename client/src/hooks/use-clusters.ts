import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Cluster = z.infer<typeof api.clusters.list.responses[200]>[number];
type ClusterDetail = z.infer<typeof api.clusters.get.responses[200]>;

export function useClusters() {
  return useQuery<Cluster[]>({
    queryKey: [api.clusters.list.path],
    queryFn: async () => {
      const res = await fetch(api.clusters.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clusters");
      return api.clusters.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000,
  });
}

export function useCluster(id: number | null) {
  return useQuery<ClusterDetail | null>({
    queryKey: [api.clusters.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.clusters.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch cluster details");
      return api.clusters.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useDeleteCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/clusters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete cluster");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.clusters.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
    },
  });
}
