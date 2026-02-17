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
