import { useWebMonitors, useWebMonitor, useDeleteWebMonitor } from "@/hooks/use-web-monitors";
import { useProjects, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Shell } from "@/components/layout/Shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Activity, Clock, Shield, Search, Plus, Trash2, Edit2, Eye, Layout, ChevronRight, ChevronDown, Folder, ExternalLink, AlertTriangle, Server, Globe } from "lucide-react";
import { useState, Fragment } from "react";
import { MonitorDetailView } from "@/components/MonitorDetailView";
import { WebMonitorEditDialog } from "@/components/WebMonitorEditDialog";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWebMonitorSchema } from "@shared/schema";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type WebMonitorFormValues = z.infer<typeof insertWebMonitorSchema>;

export default function WebMonitoringPage() {
    const { data: monitors, isLoading } = useWebMonitors();
    const { data: projects } = useProjects();
    const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingMonitor, setEditingMonitor] = useState<any | null>(null);
    const [isCreatingMonitor, setIsCreatingMonitor] = useState(false);
    const [deletingMonitorId, setDeletingMonitorId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const deleteWebMonitor = useDeleteWebMonitor();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const toggleProject = (name: string) => {
        setExpandedProjects(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(api.webMonitors.delete.path.replace(":id", String(id)), {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete monitor");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
            toast({ title: "Monitor deleted", description: "The web monitor has been removed." });
            setDeletingMonitorId(null);
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to delete monitor", variant: "destructive" });
        },
    });

    const filteredMonitors = monitors?.filter(m =>
        (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.url && m.url.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupedMonitors = filteredMonitors?.reduce((acc, m) => {
        const project = m.project;
        const projectKey = project ? `project-${project.id}` : "uncategorized";
        if (!acc[projectKey]) {
            acc[projectKey] = {
                project: project || { name: "Uncategorized" },
                items: []
            };
        }
        acc[projectKey].items.push(m);
        return acc;
    }, {} as Record<string, { project: any, items: any[] }>);

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'up': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'down': return 'text-destructive bg-destructive/10 border-destructive/20';
            default: return 'text-muted-foreground bg-muted/10 border-muted/20';
        }
    };

    return (
        <Shell>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
                <div>
                    <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent italic">
                        Web Monitors
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Uptime monitoring for your web services.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search monitors..."
                            className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        className="h-11 px-6 bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 rounded-xl font-bold tracking-tight"
                        onClick={() => setIsCreatingMonitor(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Monitor
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40 border-b border-border/40">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Monitor</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Status</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Response</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">SSL</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Last Check</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-8 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : Object.keys(groupedMonitors || {}).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-medium">
                                    {searchTerm ? "No monitors match your search criteria." : "No web monitors active. Use 'Register Resource' to start monitoring."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(groupedMonitors || {}).map(([projectKey, group]) => {
                                const { project, items: projectMonitors } = group;
                                const projectName = project.name;
                                const isExpanded = expandedProjects[projectKey];
                                return (
                                    <Fragment key={projectKey}>
                                        <TableRow className="bg-muted/10 hover:bg-muted/20 group/header transition-colors">
                                            <TableCell colSpan={8} className="py-3 px-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleProject(projectKey)}>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                        <Activity className="h-4 w-4 text-purple-500/60" />
                                                        <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                                                        <span className="text-[10px] font-medium bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full ml-2">
                                                            {projectMonitors.length} {projectMonitors.length === 1 ? 'Monitor' : 'Monitors'}
                                                        </span>
                                                    </div>
                                                    {project.id && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingProject(project);
                                                                    setNewProject({ name: project.name, description: project.description || "" });
                                                                    setIsProjectFormOpen(true);
                                                                }}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("Are you sure you want to delete this project? Resources will be unassigned but not deleted.")) {
                                                                        deleteProject.mutate(project.id, {
                                                                            onSuccess: () => {
                                                                                toast({ title: "Project deleted successfully" });
                                                                                queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
                                                                                queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && projectMonitors.map((m) => {
                                            const lastMetric = m.metrics?.[0];
                                            return (
                                                <TableRow key={m.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                    <TableCell className="pl-8 py-4">
                                                        <div className="flex items-center gap-3 cursor-pointer group/name" onClick={() => { setSelectedMonitorId(m.id); setIsDetailOpen(true); }}>
                                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/name:scale-110 transition-transform duration-300">
                                                                <Activity className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm tracking-tight group-hover/name:text-primary transition-colors">{m.name}</span>
                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{m.url}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider", getStatusColor(m.lastStatus))}>
                                                            {m.lastStatus || 'pending'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs font-medium">{lastMetric?.responseTime ?? 0}ms</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className={cn("h-3 w-3", m.sslStatus === 'valid' ? 'text-emerald-500' : 'text-amber-500')} />
                                                            <span className="text-xs font-medium">
                                                                {m.sslExpiryDate ? formatDistanceToNow(new Date(m.sslExpiryDate), { addSuffix: true }) : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <span className="text-xs font-bold text-foreground/80">
                                                            {m.lastCheck ? formatDistanceToNow(new Date(m.lastCheck), { addSuffix: true }) : "Never"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right pr-6">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" onClick={() => { setSelectedMonitorId(m.id); setIsDetailOpen(true); }}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>

                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors" onClick={() => setEditingMonitor(m)}>
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>

                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors" onClick={() => setDeletingMonitorId(m.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <WebMonitorEditDialog
                open={!!editingMonitor}
                onOpenChange={(open) => !open && setEditingMonitor(null)}
                monitor={editingMonitor}
            />

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/50 shadow-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display flex items-center gap-2">
                            <Activity className="h-6 w-6 text-primary" />
                            Monitor Uptime
                        </DialogTitle>
                    </DialogHeader>
                    {selectedMonitorId && <MonitorDetailView id={selectedMonitorId} />}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreatingMonitor} onOpenChange={setIsCreatingMonitor}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display italic font-black">Add Monitor</DialogTitle>
                        <DialogDescription>Setup a new periodic health check for a URL.</DialogDescription>
                    </DialogHeader>
                    <WebMonitorForm projects={projects || []} onClose={() => setIsCreatingMonitor(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingMonitorId} onOpenChange={(open) => !open && setDeletingMonitorId(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Delete Monitor
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Stop monitoring this URL? This will permanently delete all uptime metrics.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => deletingMonitorId && deleteMutation.mutate(deletingMonitorId)}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Project Management Dialogs */}
            <Dialog open={isProjectFormOpen} onOpenChange={(open) => { setIsProjectFormOpen(open); if (!open) setEditingProject(null); }}>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                        <DialogDescription>Group your resources by organization or department.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Project Name</Label>
                            <Input
                                placeholder="e.g. Marketing, FinOps"
                                value={newProject.name}
                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (Optional)</Label>
                            <Input
                                placeholder="Brief purpose of this project"
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsProjectFormOpen(false);
                                setEditingProject(null);
                                setNewProject({ name: "", description: "" });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!newProject.name) return;
                                try {
                                    if (editingProject) {
                                        await updateProject.mutateAsync({ id: editingProject.id, data: newProject });
                                        toast({ title: "Project updated successfully" });
                                    }
                                    queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
                                    queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
                                    setIsProjectFormOpen(false);
                                    setEditingProject(null);
                                    setNewProject({ name: "", description: "" });
                                } catch (err) {
                                    toast({ title: "Action failed", variant: "destructive" });
                                }
                            }}
                            disabled={updateProject.isPending || !newProject.name}
                            className="font-bold relative overflow-hidden group"
                        >
                            <span className="relative z-10">{editingProject ? "Save Changes" : "Create Project"}</span>
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

export function WebMonitorForm({ monitor, projects, onClose }: { monitor?: any, projects: any[], onClose: () => void }) {
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

    const mutation = useMutation({
        mutationFn: async (data: WebMonitorFormValues) => {
            const isUpdate = !!(monitor && monitor.id);
            const url = isUpdate ? api.webMonitors.update.path.replace(":id", String(monitor.id)) : api.webMonitors.create.path;
            const method = isUpdate ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save monitor");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
            if (data.projectId) {
                queryClient.invalidateQueries({ queryKey: [api.projects.resources.path, data.projectId] });
            } else {
                queryClient.invalidateQueries({ queryKey: [api.projects.resources.path] });
            }
            toast({ title: monitor ? "Monitor updated" : "Monitor created", description: "Monitoring configuration saved." });
            onClose();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    return (
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
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-11 px-6">Cancel</Button>
                <Button type="submit" disabled={mutation.isPending} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
                    {mutation.isPending ? "Saving..." : monitor ? "Update Monitor" : "Create Monitor"}
                </Button>
            </DialogFooter>
        </form>
    );
}

