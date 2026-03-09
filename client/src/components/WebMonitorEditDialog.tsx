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
import { insertWebMonitorSchema } from "@shared/schema";

type WebMonitorFormValues = z.infer<typeof insertWebMonitorSchema>;

interface WebMonitorEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    monitor: any | null;
}

export function WebMonitorEditDialog({ open, onOpenChange, monitor }: WebMonitorEditDialogProps) {
    const { data: projects } = useProjects();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<WebMonitorFormValues>({
        resolver: zodResolver(insertWebMonitorSchema),
        defaultValues: {
            name: monitor?.name || "",
            url: monitor?.url || "https://",
            method: monitor?.method || "GET",
            expectedStatus: monitor?.expectedStatus || 200,
            healthCheckString: monitor?.healthCheckString || "",
            followRedirects: monitor?.followRedirects ?? true,
            timeout: monitor?.timeout || 10000,
            sslExpiryThreshold: monitor?.sslExpiryThreshold || 7,
            projectId: monitor?.projectId || null,
        },
    });

    // Reset form when monitor changes
    if (monitor && form.getValues("name") !== monitor.name && !form.formState.isDirty) {
        form.reset({
            name: monitor.name || "",
            url: monitor.url || "https://",
            method: monitor.method || "GET",
            expectedStatus: monitor.expectedStatus || 200,
            healthCheckString: monitor.healthCheckString || "",
            followRedirects: monitor.followRedirects ?? true,
            timeout: monitor.timeout || 10000,
            sslExpiryThreshold: monitor.sslExpiryThreshold || 7,
            projectId: monitor.projectId || null,
        });
    }

    const mutation = useMutation({
        mutationFn: async (data: WebMonitorFormValues) => {
            const url = api.webMonitors.update.path.replace(":id", String(monitor.id));
            const res = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update monitor");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
            if (data.projectId) {
                queryClient.invalidateQueries({ queryKey: [api.projects.resources.path, data.projectId] });
            } else {
                queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
            }
            toast({ title: "Monitor updated", description: "Monitoring configuration saved." });
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/50 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display italic font-black">Edit Monitor</DialogTitle>
                    <DialogDescription>Update monitoring configuration for {monitor?.name}.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-5 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Friendly Name</Label>
                        <Input id="name" placeholder="e.g. My Website" {...form.register("name")} className="rounded-xl h-11" />
                        {form.formState.errors.name && <span className="text-[10px] text-destructive font-bold uppercase">{form.formState.errors.name.message}</span>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="url">URL to Monitor</Label>
                        <Input id="url" placeholder="https://example.com" {...form.register("url")} className="rounded-xl h-11" />
                        {form.formState.errors.url && <span className="text-[10px] text-destructive font-bold uppercase">{form.formState.errors.url.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="method">Method</Label>
                            <Select onValueChange={(val) => form.setValue("method", val)} defaultValue={form.getValues("method")}>
                                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="HEAD">HEAD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="expectedStatus">Expected Status</Label>
                            <Input id="expectedStatus" type="number" {...form.register("expectedStatus", { valueAsNumber: true })} className="rounded-xl h-11" />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="healthCheckString">Keyword Match (Optional)</Label>
                        <Input id="healthCheckString" placeholder="e.g. Welcome to my site" {...form.register("healthCheckString")} className="rounded-xl h-11" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="project">Assign to Project</Label>
                        <Select
                            onValueChange={(val) => form.setValue("projectId", val === "none" ? null : Number(val))}
                            defaultValue={form.getValues("projectId") ? String(form.getValues("projectId")) : "none"}
                        >
                            <SelectTrigger className="rounded-xl h-11">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Uncategorized</SelectItem>
                                {projects?.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6">Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
                            {mutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
