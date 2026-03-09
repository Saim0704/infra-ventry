import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Database = z.infer<typeof api.databases.list.responses[200]>[number];
type DatabaseDetail = z.infer<typeof api.databases.get.responses[200]>;

export function useDatabases() {
  return useQuery<Database[]>({
    queryKey: [api.databases.list.path],
    queryFn: async () => {
      const res = await fetch(api.databases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch databases");
      return api.databases.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000,
  });
}

export function useDatabase(id: number | null) {
  return useQuery<DatabaseDetail | null>({
    queryKey: [api.databases.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.databases.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch database details");
      return api.databases.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.databases.delete.path.replace(":id", String(id)), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete database");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.databases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
    },
  });
}
