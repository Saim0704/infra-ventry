import { useProjects } from "@/hooks/use-projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const editClusterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    version: z.string().optional(),
    nodeCount: z.coerce.number().int().min(0).optional(),
    totalCpu: z.coerce.number().min(0).optional(),
    totalMemory: z.coerce.number().min(0).optional(),
    projectId: z.coerce.number().nullable().optional(),
});

type EditClusterFormValues = z.infer<typeof editClusterSchema>;

interface ClusterEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cluster: any | null;
}

export function ClusterEditDialog({ open, onOpenChange, cluster }: ClusterEditDialogProps) {
    const { data: projects } = useProjects();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<EditClusterFormValues>({
        resolver: zodResolver(editClusterSchema),
        defaultValues: {
            name: cluster?.name || "",
            version: cluster?.version || "",
            nodeCount: cluster?.nodeCount || 0,
            totalCpu: cluster?.totalCpu || 0,
            totalMemory: cluster?.totalMemory || 0,
            projectId: cluster?.projectId || null,
        },
    });

    // Reset form when cluster changes
    if (cluster && form.getValues("name") !== cluster.name && !form.formState.isDirty) {
        form.reset({
            name: cluster.name || "",
            version: cluster.version || "",
            nodeCount: cluster.nodeCount || 0,
            totalCpu: cluster.totalCpu || 0,
            totalMemory: cluster.totalMemory || 0,
            projectId: cluster.projectId || null,
        });
    }

    const mutation = useMutation({
        mutationFn: async (data: EditClusterFormValues) => {
            // Assuming api.clusters.update exists or using a generic approach if it doesn't
            // Let's check shared/routes.ts or just use fetch if we're unsure
            const res = await fetch(`/api/clusters/${cluster.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update cluster");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.clusters.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path.replace(":id", String(cluster.projectId))] });
            toast({ title: "Cluster updated", description: "Configuration has been saved successfully." });
            onOpenChange(false);
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update cluster", variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Cluster</DialogTitle>
                    <DialogDescription>
                        Update Kubernetes cluster details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} />
                        {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="version">K8s Version</Label>
                        <Input id="version" {...form.register("version")} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nodeCount">Nodes</Label>
                            <Input id="nodeCount" type="number" {...form.register("nodeCount")} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="totalCpu">CPU (vCPU)</Label>
                            <Input id="totalCpu" type="number" step="0.1" {...form.register("totalCpu")} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="totalMemory">RAM (GB)</Label>
                            <Input id="totalMemory" type="number" step="0.1" {...form.register("totalMemory")} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="project">Project</Label>
                        <Select
                            onValueChange={(val) => form.setValue("projectId", val === "none" ? null : Number(val))}
                            defaultValue={cluster?.projectId ? String(cluster.projectId) : "none"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Uncategorized</SelectItem>
                                {projects?.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
