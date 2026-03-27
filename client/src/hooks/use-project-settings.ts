import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";

export function useProjectAlertSettings(projectId: number) {
    const url = buildUrl(api.settings.projectAlerts.get.path, { id: projectId });
    return useQuery<any>({
        queryKey: [api.settings.projectAlerts.get.path, projectId],
        queryFn: async () => {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch project alert settings");
            return res.json();
        },
        enabled: !!projectId,
    });
}

export function useUpdateProjectAlertSettings(projectId: number) {
    const url = buildUrl(api.settings.projectAlerts.update.path, { id: projectId });
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to update project alert settings");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.settings.projectAlerts.get.path, projectId] });
        },
    });
}
export function useProjectEmailTemplates(projectId?: number | null) {
    const url = projectId 
        ? buildUrl(api.projects.emailTemplates.list.path, { id: projectId })
        : api.settings.emailTemplates.list.path;

    return useQuery<any[]>({
        queryKey: [projectId ? api.projects.emailTemplates.list.path : api.settings.emailTemplates.list.path, projectId],
        queryFn: async () => {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch email templates");
            return res.json();
        },
    });
}

export function useUpdateProjectEmailTemplate(projectId?: number | null) {
    return useMutation({
        mutationFn: async ({ alertType, data }: { alertType: string, data: any }) => {
            const url = projectId
                ? buildUrl(api.projects.emailTemplates.upsert.path, { id: projectId, alertType })
                : api.settings.emailTemplates.upsert.path.replace(':alertType', alertType);

            const res = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to update email template");
            return res.json();
        },
        onSuccess: () => {
            if (projectId === null) {
                queryClient.invalidateQueries({ queryKey: [api.projects.emailTemplates.list.path] });
                queryClient.invalidateQueries({ queryKey: [api.settings.emailTemplates.list.path] });
            } else {
                queryClient.invalidateQueries({ queryKey: [projectId ? api.projects.emailTemplates.list.path : api.settings.emailTemplates.list.path, projectId] });
            }
        },
    });
}

export function useDeleteProjectEmailTemplate(projectId?: number | null) {
    return useMutation({
        mutationFn: async (alertType: string) => {
            const url = projectId
                ? buildUrl(api.projects.emailTemplates.delete.path, { id: projectId, alertType })
                : api.settings.emailTemplates.delete.path.replace(':alertType', alertType);

            const res = await fetch(url, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to reset email template");
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [projectId ? api.projects.emailTemplates.list.path : api.settings.emailTemplates.list.path, projectId] });
        },
    });
}
