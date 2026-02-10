import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type Project = z.infer<typeof api.projects.list.responses[200]>[number];

export function useProjects() {
    return useQuery<Project[]>({
        queryKey: [api.projects.list.path],
        queryFn: async () => {
            const res = await fetch(api.projects.list.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch projects");
            return api.projects.list.responses[200].parse(await res.json());
        },
    });
}

export function useCreateProject() {
    return useMutation({
        mutationFn: async (data: z.infer<typeof api.projects.create.input>) => {
            const res = await fetch(api.projects.create.path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to create project");
            return api.projects.create.responses[201].parse(await res.json());
        },
    });
}

export function useDeleteProject() {
    return useMutation({
        mutationFn: async (id: number) => {
            const url = buildUrl(api.projects.delete.path, { id });
            const res = await fetch(url, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete project");
        },
    });
}

export function useUpdateProject() {
    return useMutation({
        mutationFn: async ({ id, data }: { id: number, data: Partial<z.infer<typeof api.projects.create.input>> }) => {
            const url = buildUrl(api.projects.update.path, { id });
            const res = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to update project");
            return api.projects.update.responses[200].parse(await res.json());
        },
    });
}

export function useProjectResources(id: number) {
    const url = buildUrl(api.projects.resources.path, { id });
    return useQuery<z.infer<typeof api.projects.resources.responses[200]>>({
        queryKey: [api.projects.resources.path, id],
        queryFn: async () => {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch project resources");
            return api.projects.resources.responses[200].parse(await res.json());
        },
        enabled: !!id,
    });
}
