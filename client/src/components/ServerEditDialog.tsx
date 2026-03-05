import { useUpdateServer } from "@/hooks/use-servers";
import { useProjects } from "@/hooks/use-projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serverWithMetricsSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { CircuitBoard } from "lucide-react";
import { z } from "zod";

type ServerWithMetrics = z.infer<typeof serverWithMetricsSchema>;

interface ServerEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    server: any | null;
}

export function ServerEditDialog({ open, onOpenChange, server }: ServerEditDialogProps) {
    const { toast } = useToast();
    const updateServer = useUpdateServer();
    const { data: projects } = useProjects();

    const form = useForm<ServerWithMetrics>({
        resolver: zodResolver(serverWithMetricsSchema),
        defaultValues: {
            hostname: "",
            name: "",
            ipAddress: "",
            os: "Linux",
            osVersion: "",
            cpuCores: 1,
            totalRam: 1,
            totalDisk: 10,
            sshUser: "root",
            sshKey: "",
            projectId: null,
            cpuUsage: 0,
            ramUsed: 0,
            storageUsed: 0,
            memoryUsage: 0,
            diskUsage: 0,
        },
    });

    const watchAll = form.watch();

    // Auto-calculate percentages
    const calculatedMemoryUsage = watchAll.totalRam > 0
        ? Math.min(100, Math.round(((watchAll.ramUsed || 0) / watchAll.totalRam) * 100))
        : 0;

    const calculatedDiskUsage = watchAll.totalDisk > 0
        ? Math.min(100, Math.round(((watchAll.storageUsed || 0) / watchAll.totalDisk) * 100))
        : 0;

    // Update form when server changes
    if (server && form.getValues("hostname") !== server.hostname) {
        const lastMetric = server.metrics?.[0] || server.metrics?.[server.metrics.length - 1];
        const ramUsed = lastMetric ? (lastMetric.memoryUsage / 100) * server.totalRam : 0;
        const storageUsed = lastMetric ? (lastMetric.diskUsage / 100) * server.totalDisk : 0;

        form.reset({
            hostname: server.hostname,
            name: server.name || "",
            ipAddress: server.ipAddress || "",
            os: server.os || "",
            osVersion: server.osVersion || "",
            cpuCores: server.cpuCores,
            totalRam: server.totalRam,
            totalDisk: server.totalDisk,
            sshUser: server.sshUser || "root",
            sshKey: server.sshKey || "",
            projectId: server.projectId || null,
            cpuUsage: lastMetric?.cpuUsage || 0,
            ramUsed: Number(ramUsed.toFixed(2)),
            storageUsed: Number(storageUsed.toFixed(2)),
            memoryUsage: lastMetric?.memoryUsage || 0,
            diskUsage: lastMetric?.diskUsage || 0,
        });
    }

    const onSubmit = async (data: ServerWithMetrics) => {
        if (!server) return;
        try {
            const payload = {
                ...data,
                memoryUsage: calculatedMemoryUsage,
                diskUsage: calculatedDiskUsage
            };
            await updateServer.mutateAsync({ id: server.id, data: payload });
            toast({ title: "Server updated successfully" });
            queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path.replace(":id", String(server.projectId))] });
            onOpenChange(false);
        } catch (err) {
            toast({ title: "Update failed", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Server: {server?.name || server?.hostname}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Friendly Name</FormLabel>
                                        <FormControl><Input {...field} placeholder="Main Web Server" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="hostname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hostname / Technical ID</FormLabel>
                                        <FormControl><Input {...field} placeholder="web-srv-01" disabled /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="ipAddress"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IP Address</FormLabel>
                                        <FormControl><Input {...field} placeholder="192.168.1.10" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="projectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                                            value={field.value?.toString() || "none"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a project" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-background border-border shadow-xl">
                                                <SelectItem value="none">No Project</SelectItem>
                                                {projects?.map((p) => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="os"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OS Name</FormLabel>
                                        <FormControl><Input {...field} placeholder="Ubuntu / Windows" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="osVersion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OS Version</FormLabel>
                                        <FormControl><Input {...field} placeholder="22.04 LTS" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="sshUser"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SSH User</FormLabel>
                                        <FormControl><Input {...field} placeholder="root" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sshKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Identity / SSH Key</FormLabel>
                                        <FormControl><Input {...field} placeholder="id_rsa or nickname" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="cpuCores"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>vCPU Cores</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="totalRam"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total RAM (GB)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="totalDisk"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Disk (GB)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-4 bg-secondary/20 rounded-xl space-y-4 border border-border/50">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <CircuitBoard className="h-4 w-4" /> Performance Metrics
                            </h4>
                            <div className="grid grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="cpuUsage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPU Usage %</FormLabel>
                                            <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ramUsed"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RAM Used (GB)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                                                        {calculatedMemoryUsage}%
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="storageUsed"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Disk Used (GB)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">
                                                        {calculatedDiskUsage}%
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={updateServer.isPending}>
                                {updateServer.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
