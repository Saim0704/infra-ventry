import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Token = z.infer<typeof api.tokens.list.responses[200]>[number];
type CreateTokenInput = z.infer<typeof api.tokens.create.input>;
type CreateTokenResponse = z.infer<typeof api.tokens.create.responses[201]>;

export function useTokens() {
  return useQuery<Token[]>({
    queryKey: [api.tokens.list.path],
    queryFn: async () => {
      const res = await fetch(api.tokens.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return api.tokens.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTokenInput) => {
      const validated = api.tokens.create.input.parse(data);
      const res = await fetch(api.tokens.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create token");
      return api.tokens.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tokens.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
    },
  });
}

export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tokens.revoke.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to revoke token");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tokens.list.path] });
    },
  });
}
