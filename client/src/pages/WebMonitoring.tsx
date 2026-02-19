import { useWebMonitors, useWebMonitor } from "@/hooks/use-web-monitors";
import { useProjects } from "@/hooks/use-projects";
import { Shell } from "@/components/layout/Shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe, Activity, Shield, Search, Plus, Layout, ChevronRight, ChevronDown, Eye, Trash2, Edit2, AlertTriangle, Clock, Server } from "lucide-react";
import { useState, Fragment } from "react";
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
    const [editingMonitor, setEditingMonitor] = useState<any | null>(null);
    const [isCreatingMonitor, setIsCreatingMonitor] = useState(false);
    const [deletingMonitorId, setDeletingMonitorId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const toggleProject = (name: string) => {
        setCollapsedProjects(prev => ({ ...prev, [name]: !prev[name] }));
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
        const projectName = m.project?.name || "Uncategorized";
        if (!acc[projectName]) acc[projectName] = [];
        acc[projectName].push(m);
        return acc;
    }, {} as Record<string, any[]>);

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'up': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'down': return 'text-destructive bg-destructive/10 border-destructive/20';
            default: return 'text-muted-foreground bg-muted/10 border-muted/20';
        }
    };

    return (
        <Shell title="Website Monitoring" description="Track website availability, response times, and SSL certificates.">
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
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredMonitors?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                                    {searchTerm ? "No monitors match your search." : "No web monitors added yet."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(groupedMonitors || {}).map(([projectName, projectMonitors]) => {
                                const isCollapsed = collapsedProjects[projectName];
                                return (
                                    <Fragment key={projectName}>
                                        <TableRow className="bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => toggleProject(projectName)}>
                                            <TableCell colSpan={6} className="py-3 px-6">
                                                <div className="flex items-center gap-2">
                                                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                                    <Layout className="h-4 w-4 text-primary/60" />
                                                    <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {!isCollapsed && projectMonitors.map((m) => {
                                            const lastMetric = m.metrics?.[0];
                                            return (
                                                <TableRow key={m.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                    <TableCell className="pl-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                                                <Globe className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm tracking-tight">{m.name}</span>
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
                                                            <Dialog onOpenChange={(open) => setSelectedMonitorId(open ? m.id : null)}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/50 shadow-2xl rounded-3xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle className="text-2xl font-display flex items-center gap-2">
                                                                            <Globe className="h-6 w-6 text-primary" />
                                                                            {m.name} Uptime
                                                                        </DialogTitle>
                                                                    </DialogHeader>
                                                                    <MonitorDetailView id={selectedMonitorId} />
                                                                </DialogContent>
                                                            </Dialog>

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

            <Dialog open={!!editingMonitor} onOpenChange={(open) => !open && setEditingMonitor(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display italic font-black">Edit Monitor</DialogTitle>
                        <DialogDescription>Update monitoring configuration for {editingMonitor?.name}.</DialogDescription>
                    </DialogHeader>
                    {editingMonitor && <WebMonitorForm monitor={editingMonitor} projects={projects || []} onClose={() => setEditingMonitor(null)} />}
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
        </Shell>
    );
}

function WebMonitorForm({ monitor, projects, onClose }: { monitor?: any, projects: any[], onClose: () => void }) {
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
            const isUpdate = !!monitor;
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.webMonitors.list.path] });
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

function MonitorDetailView({ id }: { id: number | null }) {
    const { data: monitor, isLoading } = useWebMonitor(id);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full rounded-2xl" /></div>;
    if (!monitor) return null;

    const chartData = monitor.metrics.slice(-30).map(m => ({
        time: format(new Date(m.createdAt || new Date()), "HH:mm"),
        ms: m.responseTime,
        isUp: m.isUp ? 1 : 0
    }));

    const avgResponse = Math.round(chartData.reduce((acc, curr) => acc + (curr.ms || 0), 0) / (chartData.length || 1));
    const uptimePct = Math.round((chartData.filter(d => d.isUp).length / (chartData.length || 1)) * 100);

    return (
        <div className="space-y-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Activity className="h-3 w-3" />
                            Uptime (Last 30)
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{uptimePct}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-primary mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Clock className="h-3 w-3" />
                            Avg Response
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{avgResponse}ms</div>
                    </CardContent>
                </Card>

                <Card className="bg-accent/5 border-accent/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-accent mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Shield className="h-3 w-3" />
                            SSL Expiry
                        </div>
                        <div className="text-lg font-black font-display italic">
                            {monitor.sslExpiryDate ? format(new Date(monitor.sslExpiryDate), "MMM dd, yyyy") : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                            {monitor.sslExpiryDate ? formatDistanceToNow(new Date(monitor.sslExpiryDate), { addSuffix: true }) : ''}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 italic">
                        <Activity className="h-4 w-4 text-primary" />
                        Performance History
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Response Time (ms)</span>
                </div>
                <div className="h-[250px] w-full bg-card border border-border/50 rounded-3xl p-6 shadow-inner overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="ms"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMs)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
