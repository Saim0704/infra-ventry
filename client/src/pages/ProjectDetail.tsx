import { useProjectResources, useUpdateProject, useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useDeleteServer } from "@/hooks/use-servers";
import { useDeleteDatabase } from "@/hooks/use-databases";
import { useDeleteCluster } from "@/hooks/use-clusters";
import { useDeleteWebMonitor } from "@/hooks/use-web-monitors";
import { useCreateToken } from "@/hooks/use-tokens";
import { useProjectAlertSettings, useUpdateProjectAlertSettings, useProjectEmailTemplates, useUpdateProjectEmailTemplate, useDeleteProjectEmailTemplate } from "@/hooks/use-project-settings";
import { useLocation, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Server, Database, Cloud, Edit, Edit2, Trash2, ChevronLeft, Plus, ChevronDown, Shield, Bell, Activity, Layout, Eye, Terminal, Mail, Save, Key, Send, ExternalLink, Settings, AlertTriangle, Check, X, Info, MessageSquare, Type, Clock, VolumeX, Volume2, CheckCircle2, Cpu, Zap, HardDrive, AlertCircle, Timer, ShieldCheck, Copy, ImageIcon, Building2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { ServerDetailView } from "@/components/ServerDetailView";
import { DatabaseDetailView } from "@/components/DatabaseDetailView";
import { ClusterDetailView } from "@/components/ClusterDetailView";
import { MonitorDetailView } from "@/components/MonitorDetailView";
import { ServerEditDialog } from "@/components/ServerEditDialog";
import { DatabaseEditDialog } from "@/components/DatabaseEditDialog";
import { ClusterEditDialog } from "@/components/ClusterEditDialog";
import { WebMonitorEditDialog } from "@/components/WebMonitorEditDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/ui/UsageBar";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { RegistrationModal } from "@/components/RegistrationModal";
import { WebMonitorForm } from "./WebMonitoring";
import { useForm, useFieldArray } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AddDomainDialog } from "@/components/AddDomainDialog";
import { useDeleteDomainMonitor } from "@/hooks/use-domain-monitors";

export default function ProjectDetailPage() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { data: resources, isLoading } = useProjectResources(Number(id));
    const { data: projectAlertSettings } = useProjectAlertSettings(Number(id));
    const createToken = useCreateToken();
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem(`project_${id}_tab`) || "servers");
    const [isAddingWebMonitor, setIsAddingWebMonitor] = useState(false);
    const [initialRegTab, setInitialRegTab] = useState("vm");
    const { data: allProjects } = useProjects();


    useEffect(() => {
        localStorage.setItem(`project_${id}_tab`, activeTab);
    }, [activeTab, id]);

    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const deleteServer = useDeleteServer();
    const deleteDatabase = useDeleteDatabase();
    const deleteCluster = useDeleteCluster();
    const deleteWebMonitor = useDeleteWebMonitor();
    const deleteDomainMonitor = useDeleteDomainMonitor();
    const { toast } = useToast();

    const [editingServer, setEditingServer] = useState<any | null>(null);
    const [editingDatabase, setEditingDatabase] = useState<any | null>(null);
    const [editingCluster, setEditingCluster] = useState<any | null>(null);
    const [editingMonitor, setEditingMonitor] = useState<any | null>(null);
    const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && resources?.project) {
            setEditName(resources.project.name);
            setEditDescription(resources.project.description || "");
        }

        if (!isLoading && resources && resources.project && resources.tokens.length === 0) {
            console.log("Auto-creating token for project:", resources.project.name);
            createToken.mutate({
                name: `Default Token for ${resources.project.name}`,
                type: "vm",
                projectId: resources.project.id,
                token: "placeholder"
            });
        }
    }, [isLoading, resources, resources?.tokens?.length, id]);

    if (isLoading) {
        return (
            <Shell title="Loading Project..." description="Fetching resources...">
                <div className="space-y-6">
                    <Skeleton className="h-64 rounded-3xl" />
                    <div className="grid grid-cols-3 gap-6">
                        <Skeleton className="h-32 rounded-2xl" />
                        <Skeleton className="h-32 rounded-2xl" />
                        <Skeleton className="h-32 rounded-2xl" />
                    </div>
                </div>
            </Shell>
        );
    }

    if (!resources) {
        return (
            <Shell title="Project Not Found" description="The requested project does not exist.">
                <div className="flex flex-col items-center justify-center h-64">
                    <Button onClick={() => setLocation("/projects")}>Back to Projects</Button>
                </div>
            </Shell>
        );
    }

    const { project, servers, databases, clusters, webMonitors, domainMonitors = [] } = resources;

    return (
        <Shell>
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => setLocation("/projects")}
                    className="mb-4 -ml-2 text-muted-foreground hover:text-primary transition-colors"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Projects
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-display font-black tracking-tight">{project.name}</h1>
                        <p className="text-muted-foreground mt-1 text-lg max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="rounded-xl border-emerald-500/20 text-emerald-500 font-bold hover:bg-emerald-500/10"
                                >
                                    <Activity className="mr-2 h-4 w-4" /> Status Page <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-emerald-500/10 bg-card/95 backdrop-blur-md shadow-2xl">
                                <DropdownMenuItem
                                    onClick={() => window.open(`/status/${(project as any).slug}`, '_blank')}
                                    className="gap-2 focus:bg-emerald-500/10 focus:text-emerald-500 cursor-pointer py-2.5"
                                >
                                    <Eye className="h-4 w-4" /> View Status Page
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setActiveTab("settings")}
                                    className="gap-2 focus:bg-emerald-500/10 focus:text-emerald-500 cursor-pointer py-2.5"
                                >
                                    <Edit className="h-4 w-4" /> Edit Status Page
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="rounded-xl border-accent/20 text-accent font-bold hover:bg-accent/5"
                                >
                                    <Settings className="mr-2 h-4 w-4" /> Project Settings
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setIsEditProjectOpen(true)} className="cursor-pointer">
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this project? Resources will be unassigned but not deleted.")) {
                                            deleteProject.mutate(project.id, {
                                                onSuccess: () => {
                                                    toast({ title: "Project deleted successfully" });
                                                    setLocation("/projects");
                                                },
                                                onError: () => {
                                                    toast({ title: "Failed to delete project", variant: "destructive" });
                                                }
                                            });
                                        }
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/10">
                                    <Plus className="mr-2 h-4 w-4" /> Add Resources <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-primary/10 bg-card/95 backdrop-blur-md shadow-2xl">
                                <DropdownMenuItem
                                    onClick={() => { setInitialRegTab("vm"); setModalOpen(true); }}
                                    className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                                >
                                    <Server className="h-4 w-4" /> Add Servers
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => { setInitialRegTab("db"); setModalOpen(true); }}
                                    className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                                >
                                    <Database className="h-4 w-4" /> Add Databases
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => { setInitialRegTab("k8s"); setModalOpen(true); }}
                                    className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                                >
                                    <Cloud className="h-4 w-4" /> Add Cluster
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsAddingWebMonitor(true)}
                                    className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                                >
                                    <Activity className="h-4 w-4" /> Add Websites
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsAddDomainOpen(true)}
                                    className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer py-2.5"
                                >
                                    <Globe className="h-4 w-4" /> Add Domains
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <RegistrationModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                token={resources?.tokens?.[0]?.token || null}
                projectName={project.name}
                initialTab={initialRegTab}
            />

            <Dialog open={isAddingWebMonitor} onOpenChange={setIsAddingWebMonitor}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display italic font-black">Add Monitor</DialogTitle>
                        <DialogDescription>Setup a new periodic health check for a URL.</DialogDescription>
                    </DialogHeader>
                    <WebMonitorForm
                        projects={allProjects || []}
                        onClose={() => setIsAddingWebMonitor(false)}
                        monitor={{ projectId: project.id }}
                    />
                </DialogContent>
            </Dialog>

            <AddDomainDialog
                open={isAddDomainOpen}
                onOpenChange={setIsAddDomainOpen}
                projectId={project.id}
            />

            {/* Edit Project Dialog */}
            <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update the name and description for this project cluster.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Project Name</Label>
                            <Input
                                placeholder="e.g. Marketing, FinOps"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (Optional)</Label>
                            <Input
                                placeholder="Brief purpose of this project"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditProjectOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (!editName) return;
                                updateProject.mutate({ id: project.id, data: { name: editName, description: editDescription } }, {
                                    onSuccess: () => {
                                        toast({ title: "Project updated successfully" });
                                        setIsEditProjectOpen(false);
                                    },
                                    onError: () => {
                                        toast({ title: "Failed to update project", variant: "destructive" });
                                    }
                                });
                            }}
                            disabled={updateProject.isPending || !editName}
                            className="font-bold relative overflow-hidden group"
                        >
                            <span className="relative z-10">Save Changes</span>
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
                <MetricCard
                    title="Total Servers"
                    value={servers.length}
                    icon={<Server className="h-5 w-5" />}
                    color="bg-blue-500/10 text-blue-500"
                />
                <MetricCard
                    title="Databases"
                    value={databases.length}
                    icon={<Database className="h-5 w-5" />}
                    color="bg-emerald-500/10 text-emerald-500"
                />
                <MetricCard
                    title="K8s Clusters"
                    value={clusters.length}
                    icon={<Cloud className="h-5 w-5" />}
                    color="bg-amber-500/10 text-amber-500"
                />
                <MetricCard
                    title="Web Monitors"
                    value={webMonitors.length}
                    icon={<Globe className="h-5 w-5" />}
                    color="bg-purple-500/10 text-purple-500"
                />
                <MetricCard
                    title="Domain Monitors"
                    value={domainMonitors?.length || 0}
                    icon={<Globe className="h-5 w-5" />}
                    color="bg-indigo-500/10 text-indigo-500"
                />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-slate-200/40 p-1.5 rounded-2xl h-auto md:h-[64px] border-none mb-12 gap-1.5 overflow-hidden">
                    {[
                        { value: "servers", label: "Servers", icon: Server, count: servers.length },
                        { value: "databases", label: "Databases", icon: Database, count: databases.length },
                        { value: "clusters", label: "Clusters", icon: Cloud, count: clusters.length },
                        { value: "web", label: "Web", icon: Activity, count: webMonitors.length },
                        { value: "domains", label: "Domains", icon: Globe, count: domainMonitors?.length || 0 },
                        { value: "settings", label: "Settings", icon: Shield, count: null },
                    ].map((item) => (
                        <TabsTrigger 
                            key={item.value}
                            value={item.value} 
                            className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-[0_8px_30px_rgb(0,0,0,0.08)] data-[state=active]:text-primary font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 group border border-transparent data-[state=active]:border-border/40 hover:bg-background/40"
                        >
                            <item.icon className="w-4.5 h-4.5 opacity-70 group-data-[state=active]:opacity-100 group-data-[state=active]:scale-110 transition-transform" />
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span className="text-[10px] font-black">{item.label}</span>
                                {item.count !== null && (
                                    <span className="text-[9px] font-bold text-muted-foreground/60 group-data-[state=active]:text-primary/70 tracking-tighter">
                                        {item.count} Active Resource{item.count !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="servers">
                    <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40 border-b border-border/40">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Identifier</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Network</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">System</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[160px]">vCPU Load</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[160px]">RAM Usage</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[160px]">Disk Space</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[140px]">Last Active</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-medium">
                                            No servers in this project.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    servers.map(server => {
                                        const lastMetric = (server as any).metrics?.[0];
                                        return (
                                            <TableRow key={server.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                <TableCell className="pl-8 py-4">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="flex items-center gap-3 cursor-pointer group/name">
                                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/name:scale-110 transition-transform duration-300">
                                                                    <Server className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm tracking-tight group-hover/name:text-primary transition-colors">{server.name || server.hostname}</span>
                                                                    {server.name && server.name !== server.hostname && (
                                                                        <span className="text-[10px] text-muted-foreground font-mono">{server.hostname}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black font-display italic">Server Identity: {server.name || server.hostname}</DialogTitle>
                                                                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                    Comprehensive system resource profile and metrics
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ServerDetailView id={server.id} />
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell className="py-4 font-mono text-[10px]">
                                                    <code className="bg-secondary/50 px-2 py-1 rounded-md border border-border/50 text-foreground/80 shadow-inner">
                                                        {(server as any).ipAddress || "0.0.0.0"}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all duration-300">
                                                            {(server as any).os?.toLowerCase().includes("win") ? <Layout className="h-3 w-3 text-blue-500" /> : <Terminal className="h-3 w-3 text-primary" />}
                                                            <span className="text-xs font-semibold">{(server as any).os || "Linux"}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-medium pl-4.5">{(server as any).osVersion || "Unknown"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.cpuUsage || 0}
                                                        label={`${server.cpuCores} vCPUs`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.memoryUsage || 0}
                                                        label={`${Math.round(((lastMetric?.memoryUsage || 0) / 100) * (server.totalRam || 0))} / ${Math.round(server.totalRam || 0)} GB`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.diskUsage || 0}
                                                        label={`${Math.round(((lastMetric?.diskUsage || 0) / 100) * (server.totalDisk || 0))} / ${Math.round(server.totalDisk || 0)} GB`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <StatusBadge lastSeen={(server as any).lastSeen} />
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-8">
                                                    <div className="flex justify-end gap-1">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-2xl font-black font-display italic">Server Identity: {server.name || server.hostname}</DialogTitle>
                                                                    <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                        Comprehensive system resource profile and metrics
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <ServerDetailView id={server.id} />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors"
                                                            onClick={() => setEditingServer(server)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to delete server ${server.name || server.hostname}?`)) {
                                                                    deleteServer.mutate(server.id, {
                                                                        onSuccess: () => toast({ title: "Server deleted" }),
                                                                        onError: () => toast({ title: "Failed to delete server", variant: "destructive" })
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="databases">
                    <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40 border-b border-border/40">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Identifier</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Engine</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Network</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[160px]">Storage Used</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[160px]">Connections</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[140px]">Last Active</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {databases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-medium">
                                            No databases in this project.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    databases.map(db => {
                                        const lastMetric = (db as any).metrics?.[0];
                                        return (
                                            <TableRow key={db.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                <TableCell className="pl-8 py-4">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="flex items-center gap-3 cursor-pointer group/name">
                                                                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/name:scale-110 transition-transform duration-300">
                                                                    <Database className="h-4 w-4" />
                                                                </div>
                                                                <span className="font-bold text-sm tracking-tight group-hover/name:text-emerald-500 transition-colors">{db.name}</span>
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black font-display italic">Database: {db.name}</DialogTitle>
                                                                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                    Engine details and connection history
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DatabaseDetailView id={db.id} />
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-semibold">{(db as any).engine || "PostgreSQL"}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{(db as any).version || "Unknown"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-mono text-[10px]">
                                                    <code className="bg-secondary/50 px-2 py-1 rounded-md border border-border/50 text-foreground/80 shadow-inner">
                                                        {(db as any).host || "localhost"}:{(db as any).port || 5432}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.storageUsedPercentage || 0}
                                                        label={`${lastMetric?.storageUsed || 0} GB`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.connectionPercentage || 0}
                                                        label={`${lastMetric?.activeConnections || 0} Sessions`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <StatusBadge lastSeen={(db as any).lastSeen} />
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-8">
                                                    <div className="flex justify-end gap-1">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-500 transition-colors">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-2xl font-black font-display italic">Database: {db.name}</DialogTitle>
                                                                    <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                        Engine details and connection history
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <DatabaseDetailView id={db.id} />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors"
                                                            onClick={() => setEditingDatabase(db)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to delete database ${db.name}?`)) {
                                                                    deleteDatabase.mutate(db.id, {
                                                                        onSuccess: () => toast({ title: "Database deleted" }),
                                                                        onError: () => toast({ title: "Failed to delete database", variant: "destructive" })
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="clusters">
                    <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40 border-b border-border/40">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Identifier</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Version</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Capacity</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[180px]">CPU Usage</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[180px]">MEM Usage</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Pods</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 w-[140px]">Status</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clusters.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-medium">
                                            No clusters in this project.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    clusters.map((cluster: any) => {
                                        const lastMetric = cluster.metrics?.[0];
                                        return (
                                            <TableRow key={cluster.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                <TableCell className="pl-8 py-4">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="flex items-center gap-3 cursor-pointer group/name">
                                                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/name:scale-110 transition-transform duration-300">
                                                                    <Cloud className="h-4 w-4" />
                                                                </div>
                                                                <span className="font-bold text-sm tracking-tight group-hover/name:text-blue-500 transition-colors">{cluster.name}</span>
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black font-display italic">Cluster: {cluster.name}</DialogTitle>
                                                                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                    Kubernetes orchestration and resource metrics
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <ClusterDetailView id={cluster.id} />
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell className="py-4 font-mono text-[10px] text-muted-foreground">
                                                    {cluster.version || "Unknown"}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-semibold">{cluster.nodeCount} Nodes</span>
                                                        <span className="text-[10px] text-muted-foreground">{cluster.totalCpu} vCPU / {cluster.totalMemory} GB</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar value={lastMetric?.cpuUsage || 0} label="" showValue={true} />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar value={lastMetric?.memoryUsage || 0} label="" showValue={true} />
                                                </TableCell>
                                                <TableCell className="py-4 font-bold text-sm">
                                                    {lastMetric?.podCount ?? 0}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <StatusBadge lastSeen={cluster.lastSeen} />
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-8">
                                                    <div className="flex justify-end gap-1">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-2xl font-black font-display italic">Cluster: {cluster.name}</DialogTitle>
                                                                    <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                        Kubernetes orchestration and resource metrics
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <ClusterDetailView id={cluster.id} />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors"
                                                            onClick={() => setEditingCluster(cluster)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to delete cluster ${cluster.name}?`)) {
                                                                    deleteCluster.mutate(cluster.id, {
                                                                        onSuccess: () => toast({ title: "Cluster deleted" }),
                                                                        onError: () => toast({ title: "Failed to delete cluster", variant: "destructive" })
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="web">
                    <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
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
                                {webMonitors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                                            No web monitors in this project.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    webMonitors.map(monitor => {
                                        const lastMetric = monitor.metrics?.[0];
                                        return (
                                            <TableRow key={monitor.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                <TableCell className="pl-8 py-4">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="flex items-center gap-3 cursor-pointer group/name">
                                                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover/name:scale-110 transition-transform duration-300">
                                                                    <Globe className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm tracking-tight group-hover/name:text-purple-500 transition-colors">{monitor.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{monitor.url}</span>
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-2xl font-black font-display italic">Web Monitor: {monitor.name}</DialogTitle>
                                                                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                    Health monitoring and performance history
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <MonitorDetailView id={monitor.id} />
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                        monitor.lastStatus === 'up' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                                                            monitor.lastStatus === 'down' ? "text-destructive bg-destructive/10 border-destructive/20" :
                                                                "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                                    )}>
                                                        {monitor.lastStatus || 'pending'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-bold text-sm">
                                                    {lastMetric?.responseTime ?? 0}<span className="text-muted-foreground font-normal text-xs ml-0.5">ms</span>
                                                </TableCell>
                                                <TableCell className="py-4 focus:outline-none">
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 text-xs font-bold",
                                                        monitor.sslStatus === 'valid' ? "text-emerald-500" :
                                                            monitor.sslStatus === 'expiring' ? "text-amber-500" : "text-destructive"
                                                    )}>
                                                        <Shield className="h-3.5 w-3.5 shrink-0" />
                                                        {monitor.sslStatus === 'valid' ? "Secure" : monitor.sslStatus || "Unknown"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                                                    {monitor.lastCheck ? format(new Date(monitor.lastCheck), "HH:mm:ss") : "Never"}
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-8">
                                                    <div className="flex justify-end gap-1">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-border/40 shadow-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-2xl font-black font-display italic">Web Monitor: {monitor.name}</DialogTitle>
                                                                    <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                                                                        Health monitoring and performance history
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <MonitorDetailView id={monitor.id} />
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors"
                                                            onClick={() => setEditingMonitor(monitor)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to delete monitor ${monitor.name}?`)) {
                                                                    deleteWebMonitor.mutate(monitor.id, {
                                                                        onSuccess: () => toast({ title: "Monitor deleted" }),
                                                                        onError: () => toast({ title: "Failed to delete monitor", variant: "destructive" })
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="domains">
                    <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40 border-b border-border/40">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Domain</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Expiry Date</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Days Remaining</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Last Check</TableHead>
                                    <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {domainMonitors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                                            No domains monitored in this project.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    domainMonitors.map((d: any) => {
                                        const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
                                        const daysLeft = expiry ? Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                        const threshold = projectAlertSettings?.domainExpiryThreshold || 30;

                                        return (
                                            <TableRow key={d.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                <TableCell className="pl-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                            <Globe className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-bold text-sm tracking-tight">{d.domain}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-medium text-sm">
                                                    {expiry ? format(expiry, "MMM dd, yyyy") : (d.lastCheck ? "Unknown" : "Pending...")}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {daysLeft !== null ? (
                                                        <div className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                                                            daysLeft <= threshold ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        )}>
                                                            {daysLeft} days remaining
                                                        </div>
                                                    ) : (
                                                        d.lastCheck ? (
                                                            <span className="text-destructive font-medium text-xs">Failed to fetch</span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">Awaiting WHOIS...</span>
                                                        )
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                                                    {d.lastCheck ? formatDistanceToNow(new Date(d.lastCheck), { addSuffix: true }) : "Never"}
                                                </TableCell>
                                                <TableCell className="py-4 text-right pr-8">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to stop monitoring ${d.domain}?`)) {
                                                                deleteDomainMonitor.mutate(d.id, {
                                                                    onSuccess: () => toast({ title: "Domain monitor removed" }),
                                                                    onError: () => toast({ title: "Failed to remove domain monitor", variant: "destructive" })
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>


                <TabsContent value="settings">
                    <ProjectSettings projectId={project.id} />
                </TabsContent>
            </Tabs>

            <ServerEditDialog
                open={!!editingServer}
                onOpenChange={(open) => !open && setEditingServer(null)}
                server={editingServer}
            />
            <DatabaseEditDialog
                open={!!editingDatabase}
                onOpenChange={(open) => !open && setEditingDatabase(null)}
                db={editingDatabase}
            />
            <ClusterEditDialog
                open={!!editingCluster}
                onOpenChange={(open) => !open && setEditingCluster(null)}
                cluster={editingCluster}
            />
            <WebMonitorEditDialog
                open={!!editingMonitor}
                onOpenChange={(open) => !open && setEditingMonitor(null)}
                monitor={editingMonitor}
            />
        </Shell >
    );
}

function MetricCard({ title, value, icon, color }: any) {
    return (
        <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-muted-foreground/80 uppercase tracking-widest">{title}</p>
                    <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
                </div>
                <p className="text-3xl font-black">{value}</p>
            </CardContent>
        </Card>
    );
}

function EmptyState({ icon, message }: any) {
    return (
        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-muted/20 border border-dashed border-border/40 rounded-3xl text-muted-foreground">
            <div className="h-16 w-16 mb-4 opacity-20">{icon}</div>
            <p className="font-bold tracking-tight">{message}</p>
        </div>
    );
}

function ProcessList({ processes }: { processes: any[] }) {
    if (!processes || processes.length === 0) return null;

    return (
        <div className="mt-6 pt-4 border-t border-border/40">
            <h4 className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                <Activity className="w-3 h-3" /> Top Processes
            </h4>
            <div className="rounded-xl border border-border/40 bg-background/50 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground bg-muted/30 px-3 py-2 border-b border-border/40">
                    <div className="col-span-2">PID</div>
                    <div className="col-span-6">NAME</div>
                    <div className="col-span-2 text-right">CPU</div>
                    <div className="col-span-2 text-right">MEM</div>
                </div>
                <div className="divide-y divide-border/40">
                    {processes.slice(0, 5).map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 text-[11px] px-3 py-2 items-center hover:bg-muted/30 transition-colors">
                            <div className="col-span-2 font-mono text-muted-foreground/80">{p.pid}</div>
                            <div className="col-span-6 font-medium truncate" title={p.name}>{p.name}</div>
                            <div className={`col-span-2 text-right font-mono font-bold ${p.cpu > 50 ? 'text-red-500' : p.cpu > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {p.cpu.toFixed(1)}%
                            </div>
                            <div className={`col-span-2 text-right font-mono font-bold ${p.memory > 50 ? 'text-blue-500' : 'text-sky-500'}`}>
                                {p.memory.toFixed(1)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ThresholdField({ control, name, label, icon: Icon, enabledName, min = 0, max = 100, step = 1, unit = "%", isToggleOnly = false, showSeparator = false }: any) {
    const finalEnabledName = enabledName || name.replace('Threshold', 'AlertEnabled');

    return (
        <div className={cn("space-y-1.5 py-1.5", showSeparator && "border-b border-border/20 last:border-0 pb-3 mb-2")}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-3 w-3 text-primary/60" />}
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60 leading-none">{label}</p>
                </div>
                <FormField
                    control={control}
                    name={finalEnabledName}
                    render={({ field }) => (
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary scale-[0.8] origin-right"
                        />
                    )}
                />
            </div>
            {!isToggleOnly && (
                <FormField
                    control={control}
                    name={finalEnabledName}
                    render={({ field: enField }) => (
                        <FormField
                            control={control}
                            name={name}
                            render={({ field }) => (
                                <FormItem className={cn("transition-opacity", !enField.value && "opacity-30 pointer-events-none")}>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={cn("font-bold text-[10px] font-mono", enField.value ? "text-primary" : "text-muted-foreground")}>
                                            {field.value}{unit}
                                        </span>
                                        <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">threshold</span>
                                    </div>
                                    <FormControl>
                                        <div className="h-2 flex items-center">
                                            <Input
                                                type="range"
                                                min={min}
                                                max={max}
                                                step={step}
                                                className="accent-primary h-1 cursor-pointer w-full"
                                                {...field}
                                                onChange={e => field.onChange(parseInt(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    )}
                />
            )}
        </div>
    );
}

function VisibilityToggle({ control, name, label, icon: Icon, description }: any) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-border/40 p-4 bg-background/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                            <FormLabel className="text-sm font-bold tracking-tight">{label}</FormLabel>
                            <FormDescription className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-none">
                                {description}
                            </FormDescription>
                        </div>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

const LATEST_AGENT_VERSION = "v4";

function ProjectSettings({ projectId }: { projectId: number }) {
    const { data: resources } = useProjectResources(projectId);
    const servers = resources?.servers || [];
    const { data: settings, isLoading } = useProjectAlertSettings(projectId);
    const updateSettings = useUpdateProjectAlertSettings(projectId);
    const { toast } = useToast();
    const [newRecipient, setNewRecipient] = useState("");
    const [testEmailRecipient, setTestEmailRecipient] = useState("");
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [isRollingOut, setIsRollingOut] = useState(false);
    const [subTab, setSubTab] = useState(() => localStorage.getItem(`project_${projectId}_subtab`) || "thresholds");

    const handleRollout = async () => {
        setIsRollingOut(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/rollout`, { method: 'POST' });
            if (!res.ok) throw new Error("Failed to trigger rollout");
            toast({ title: "Rollout Triggered", description: "All linked servers will be marked for update on their next check-in." });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsRollingOut(false);
        }
    };

    useEffect(() => {
        localStorage.setItem(`project_${projectId}_subtab`, subTab);
    }, [subTab, projectId]);

    const form = useForm<any>({
        defaultValues: {
            alertRecipients: [],
            companyName: "",
            logoUrl: "",
            cpuThreshold: 80,
            memoryThreshold: 80,
            storageThreshold: 80,
            dbStorageThreshold: 80,
            dbConnectionThreshold: 100,
            clusterCpuThreshold: 80,
            clusterMemoryThreshold: 80,
            webResponseThreshold: 3000,
            webSslExpiryThreshold: 30,
            showClusters: true,
            showWebMonitors: true,
            showServers: true,
            showDatabases: true,
            domainExpiryThreshold: 30,
            smtpHost: "",
            smtpPort: 587,
            smtpUser: "",
            smtpPass: "",
            smtpSenderName: "",
            smtpSenderEmail: "",
            cpuAlertEnabled: true,
            memoryAlertEnabled: true,
            storageAlertEnabled: true,
            dbStorageAlertEnabled: true,
            dbConnectionAlertEnabled: true,
            clusterCpuAlertEnabled: true,
            clusterMemoryAlertEnabled: true,
            webResponseAlertEnabled: true,
            webStatusAlertEnabled: true,
            webSslAlertEnabled: true,
            domainExpiryAlertEnabled: true,
        },
        values: settings ? {
            ...settings,
            alertRecipients: (settings.alertRecipients || []).map((email: string) => ({ email }))
        } : undefined
    });

    const handleSaveSection = (fields: string[]) => {
        const values = form.getValues();
        const dataToSave: any = {};
        fields.forEach(f => {
            if (f === 'alertRecipients') {
                dataToSave[f] = (values[f] || []).map((r: any) => r.email);
            } else {
                dataToSave[f] = values[f];
            }
        });

        updateSettings.mutate(dataToSave, {
            onSuccess: () => {
                toast({ title: "Section Updated", description: "Changes have been saved successfully." });
                window.location.reload(); // Quick refresh to update data correctly across hooks
            }
        });
    };

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "alertRecipients"
    });

    const handleAddRecipient = () => {
        if (newRecipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
            append({ email: newRecipient });
            setNewRecipient("");
        } else {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
        }
    };

    const handleTestProjectSmtp = async () => {
        if (!testEmailRecipient) return;
        const values = form.getValues();
        setIsSendingTest(true);
        try {
            const res = await fetch('/api/settings/smtp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: testEmailRecipient,
                    settings: {
                        host: values.smtpHost,
                        port: values.smtpPort,
                        user: values.smtpUser,
                        pass: values.smtpPass,
                        fromEmail: values.smtpSenderEmail,
                        senderName: values.smtpSenderName,
                    }
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            toast({ title: "Test Email Sent", description: `Email sent to ${testEmailRecipient} with sender name "${values.smtpSenderName || 'default'}".` });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSendingTest(false);
        }
    };

    if (isLoading) return <div className="text-center py-12 animate-pulse">Loading project settings...</div>;

    return (
        <Form {...form}>
            <div className="space-y-6">
                <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 bg-slate-200/40 p-1.5 rounded-2xl h-auto md:h-[52px] border-none mb-10 gap-1 overflow-hidden">
                        {[
                            { value: "thresholds", label: "Alert Threshold", icon: Activity },
                            { value: "recipients", label: "Alert Recipient", icon: Bell },
                            { value: "smtp", label: "SMTP Config", icon: Mail },
                            { value: "templates", label: "Email Template", icon: Send },
                            { value: "status", label: "Public Status", icon: Layout },
                            { value: "alert-history", label: "Alert History", icon: Clock },
                            { value: "alert-muting", label: "Alert Muting", icon: VolumeX },
                            { value: "agent-rollout", label: "Agent Rollout", icon: Zap },
                        ].map((item) => (
                            <TabsTrigger 
                                key={item.value}
                                value={item.value} 
                                className="rounded-xl h-full data-[state=active]:bg-background data-[state=active]:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] data-[state=active]:text-primary font-black text-[10px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group border border-transparent data-[state=active]:border-border/40 hover:bg-background/40"
                            >
                                <item.icon className="w-4 h-4 opacity-70 group-data-[state=active]:opacity-100 group-data-[state=active]:scale-110 transition-transform" />
                                <span className="hidden lg:inline-block">{item.label}</span>
                                <span className="lg:hidden">{item.label.split(' ')[1] || item.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="thresholds" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-2">
                            {/* Server Thresholds */}
                            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Server className="h-4.5 w-4.5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground/80">Server Alerts</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 py-3">
                                    <ThresholdField control={form.control} name="cpuThreshold" label="CPU Load" icon={Cpu} showSeparator />
                                    <ThresholdField control={form.control} name="memoryThreshold" label="Memory" icon={Zap} showSeparator />
                                    <ThresholdField control={form.control} name="storageThreshold" label="Storage" icon={HardDrive} />
                                </CardContent>
                            </Card>

                            {/* Database Thresholds */}
                            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Database className="h-4.5 w-4.5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-500/80">Database Alerts</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 py-3">
                                    <ThresholdField control={form.control} name="dbStorageThreshold" label="Disk Usage" icon={Database} showSeparator />
                                    <ThresholdField control={form.control} name="dbConnectionThreshold" label="Connections" icon={Activity} max={500} unit="" />
                                </CardContent>
                            </Card>

                            {/* Cluster Thresholds */}
                            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <Cloud className="h-4.5 w-4.5 text-amber-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-500/80">Cluster Alerts</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 py-3">
                                    <ThresholdField control={form.control} name="clusterCpuThreshold" label="CPU Overload" icon={Cpu} showSeparator />
                                    <ThresholdField control={form.control} name="clusterMemoryThreshold" label="Memory High" icon={Zap} />
                                </CardContent>
                            </Card>

                            {/* Web Thresholds */}
                            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <Globe className="h-4.5 w-4.5 text-purple-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-purple-500/80">Web Alerts</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 py-3">
                                    <ThresholdField control={form.control} name="webStatusAlertEnabled" label="Down Alert" icon={AlertCircle} isToggleOnly showSeparator />
                                    <ThresholdField control={form.control} name="webResponseThreshold" label="Latency" icon={Timer} max={10000} step={100} unit="ms" showSeparator />
                                    <ThresholdField control={form.control} name="webSslExpiryThreshold" label="SSL Expiry" icon={ShieldCheck} enabledName="webSslAlertEnabled" max={90} step={1} unit=" days" />
                                </CardContent>
                            </Card>

                            {/* Domain Thresholds */}
                            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40 mb-4 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                            <Globe className="h-4.5 w-4.5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-500/80">Domain Alerts</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 py-3">
                                    <ThresholdField control={form.control} name="domainExpiryThreshold" label="Domain Expiry" icon={Globe} max={90} step={1} unit=" days" />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <Button
                                onClick={() => handleSaveSection(['cpuThreshold', 'memoryThreshold', 'storageThreshold', 'dbStorageThreshold', 'dbConnectionThreshold', 'clusterCpuThreshold', 'clusterMemoryThreshold', 'webResponseThreshold', 'webSslExpiryThreshold', 'domainExpiryThreshold', 'cpuAlertEnabled', 'memoryAlertEnabled', 'storageAlertEnabled', 'dbStorageAlertEnabled', 'dbConnectionAlertEnabled', 'clusterCpuAlertEnabled', 'clusterMemoryAlertEnabled', 'webResponseAlertEnabled', 'webStatusAlertEnabled', 'webSslAlertEnabled', 'domainExpiryAlertEnabled'])}
                                className="h-11 px-8 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-wider"
                                disabled={updateSettings.isPending}
                            >
                                <Save className="h-4 w-4 mr-2" /> Save Thresholds
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="recipients" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm mt-2">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <Bell className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">Project Alert Recipients</CardTitle>
                                        <CardDescription>Notifications for this project will be sent to these email addresses.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="admin@example.com"
                                            className="h-11 bg-muted/20 border-border/40 rounded-xl"
                                            value={newRecipient}
                                            onChange={(e) => setNewRecipient(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddRecipient();
                                                }
                                            }}
                                        />
                                        <Button type="button" onClick={handleAddRecipient} className="h-11 px-6 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-wider">
                                            <Plus className="h-4 w-4 mr-2" /> Add
                                        </Button>
                                    </div>

                                    <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30 backdrop-blur-sm">
                                        <Table>
                                            <TableBody>
                                                {fields.map((field: any, index) => (
                                                    <TableRow key={field.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
                                                        <TableCell className="py-3 px-6 text-sm font-medium flex items-center gap-2">
                                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {field.email}
                                                        </TableCell>
                                                        <TableCell className="py-3 px-6 text-right">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg group-hover:scale-110 transition-transform"
                                                                onClick={() => remove(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {fields.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={2} className="py-8 text-center text-xs text-muted-foreground italic bg-muted/5">
                                                            No recipients specifically for this project. Global recipients may still be notified.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-border/30 flex justify-end">
                                    <Button
                                        onClick={() => handleSaveSection(['alertRecipients'])}
                                        className="h-11 px-8 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-wider"
                                        disabled={updateSettings.isPending}
                                    >
                                        <Save className="h-4 w-4 mr-2" /> Save Recipients
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="smtp" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm mt-2">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">Project SMTP Configuration</CardTitle>
                                        <CardDescription>Override global SMTP settings for this specific project.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="smtpHost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">SMTP Host</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="smtp.example.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpPort"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Port</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="587" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="smtpUser"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Username</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="user@example.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpPass"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="••••••••" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="smtpSenderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Sender Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Alerts" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-[10px]">E.g. "Acme Corp Alerts"</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="smtpSenderEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Sender Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="alerts@example.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-[10px]">The email address shown to recipients.</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="mt-4 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                    <p className="text-xs text-amber-600 font-medium flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        If left blank, the global SMTP settings will be used.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-border/30 mt-2 bg-muted/10 p-4 rounded-xl">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 mb-3 flex items-center gap-2">
                                        <Send className="h-3 w-3" /> Test Project SMTP
                                    </h4>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="test@example.com"
                                            className="h-10 bg-background border-border/40 rounded-lg text-sm"
                                            value={testEmailRecipient}
                                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 px-4 rounded-lg font-bold text-xs shrink-0"
                                            onClick={handleTestProjectSmtp}
                                            disabled={isSendingTest || !testEmailRecipient}
                                        >
                                            {isSendingTest ? "Sending..." : "Send Test"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-border/30 mt-6 flex justify-end">
                                    <Button
                                        onClick={() => handleSaveSection(['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSenderName', 'smtpSenderEmail'])}
                                        className="h-11 px-8 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-wider"
                                        disabled={updateSettings.isPending}
                                    >
                                        <Save className="h-4 w-4 mr-2" /> Save SMTP Settings
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="templates" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ProjectEmailTemplatesSection projectId={projectId} />
                    </TabsContent>

                    <TabsContent value="status" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm mt-2">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Layout className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">Public Status Page Options</CardTitle>
                                        <CardDescription>Control which resources are exposed on your project status page.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <VisibilityToggle
                                        control={form.control}
                                        name="showWebMonitors"
                                        label="Web Monitors"
                                        icon={Activity}
                                        description="Expose uptime and response time"
                                    />
                                    <VisibilityToggle
                                        control={form.control}
                                        name="showServers"
                                        label="Servers"
                                        icon={Server}
                                        description="Expose server health and status"
                                    />
                                    <VisibilityToggle
                                        control={form.control}
                                        name="showDatabases"
                                        label="Databases"
                                        icon={Database}
                                        description="Expose database engine and health"
                                    />
                                    <VisibilityToggle
                                        control={form.control}
                                        name="showClusters"
                                        label="K8s Clusters"
                                        icon={Cloud}
                                        description="Expose cluster orchestration status"
                                    />
                                </div>

                                <div className="pt-4 border-t border-border/40">
                                    <h4 className="text-sm font-bold mb-4">Project Branding</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="companyName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Company Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g. Acme Corp" {...field} className="rounded-xl h-11" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="logoUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Logo URL</FormLabel>
                                                    <FormControl><Input placeholder="https://..." {...field} className="rounded-xl h-11" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-border/30 mt-6 flex justify-end">
                                    <Button
                                        onClick={() => handleSaveSection(['showWebMonitors', 'showServers', 'showDatabases', 'showClusters', 'companyName', 'logoUrl'])}
                                        className="h-11 px-8 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-wider"
                                        disabled={updateSettings.isPending}
                                    >
                                        <Save className="h-4 w-4 mr-2" /> Save Status Settings
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="alert-history" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AlertHistoryTab projectId={projectId} />
                    </TabsContent>

                    <TabsContent value="alert-muting" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <AlertMutingTab projectId={projectId} settings={settings} />
                    </TabsContent>

                    <TabsContent value="agent-rollout" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm mt-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-xl font-bold">Agent Rollout Management</CardTitle>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors">
                                                            <Info className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="start" className="w-96 p-4 rounded-2xl border-border/40 bg-card/95 backdrop-blur-md shadow-2xl z-50">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500">
                                                                <Terminal className="h-3 w-3" /> Manual Installation Command
                                                            </div>
                                                            <div className="relative group">
                                                                <pre className="p-3 rounded-xl bg-background/50 border border-border/30 font-mono text-[10px] whitespace-pre-wrap break-all pr-10 leading-normal text-muted-foreground">
                                                                    {`curl -s -L "${window.location.origin}/get/install-agent.sh" | bash -s -- ${window.location.origin} ${resources?.tokens?.[0]?.token || 'YOUR_TOKEN'}`}
                                                                </pre>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="absolute top-1.5 right-1.5 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-background/80 transition-all"
                                                                    onClick={() => {
                                                                        const cmd = `curl -s -L "${window.location.origin}/get/install-agent.sh" | bash -s -- ${window.location.origin} ${resources?.tokens?.[0]?.token || 'YOUR_TOKEN'}`;
                                                                        navigator.clipboard.writeText(cmd);
                                                                        toast({ title: "Command Copied", description: "Manual installation command ready to be pasted." });
                                                                    }}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                                Run this command on your server to manually bootstrap the agent or force an immediate re-installation of the latest version.
                                                            </p>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <CardDescription>Update all linked servers to the latest agent version.</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">Latest: {LATEST_AGENT_VERSION}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-2xl border border-orange-500/20 bg-orange-500/5">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                                                <Info className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-foreground">Staged Update Mechanism</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Clicking the button below will tag every server associated with this project for an update.
                                                    The next time each agent reports its metrics (usually every 1-5 minutes), it will receive an update instruction,
                                                    download the latest script/binary, and restart the systemd service.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Version Distribution</h4>
                                        <div className="space-y-3">
                                            {Object.entries(servers.reduce((acc: any, s: any) => {
                                                const v = s.agentVersion || "v1";
                                                acc[v] = (acc[v] || 0) + 1;
                                                return acc;
                                            }, {})).map(([version, count]: [string, any]) => (
                                                <div key={version} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("h-2 w-2 rounded-full", version === LATEST_AGENT_VERSION ? "bg-emerald-500" : "bg-orange-500")} />
                                                        <span className="text-sm font-bold font-mono">{version}</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-muted-foreground">{count} {count === 1 ? 'server' : 'servers'}</span>
                                                </div>
                                            ))}
                                            {servers.length === 0 && <p className="text-xs text-muted-foreground italic">No servers linked to this project.</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30 backdrop-blur-sm">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/40">
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Server Name</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Current Version</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Status</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Pending Update</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {servers.map((server: any) => (
                                                <TableRow key={server.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
                                                    <TableCell className="py-3 font-bold text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Server className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {server.hostname}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-lg text-[10px] font-black font-mono tracking-tighter",
                                                            (server.agentVersion || "v1") === LATEST_AGENT_VERSION ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                                                        )}>
                                                            {server.agentVersion || "v1"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        {(server.agentVersion || "v1") === LATEST_AGENT_VERSION ? (
                                                            <div className="flex items-center gap-1.5 text-emerald-500">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                <span className="text-[10px] font-bold uppercase tracking-tight">Up to date</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-orange-500">
                                                                <AlertCircle className="h-3 w-3" />
                                                                <span className="text-[10px] font-bold uppercase tracking-tight">Needs Update</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        {server.pendingUpdate ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                                <Timer className="h-2.5 w-2.5" /> Queued
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">Idle</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {servers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground italic">
                                                        Add servers to this project to manage rollouts.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex justify-center py-8">
                                    {servers.length > 0 && servers.every((s: any) => (s.agentVersion || "v1") === LATEST_AGENT_VERSION) && !isRollingOut ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Button
                                                size="lg"
                                                disabled={true}
                                                className="h-14 px-10 rounded-2xl bg-muted text-muted-foreground border-2 border-dashed border-border/40 font-black uppercase tracking-widest text-sm cursor-not-allowed opacity-50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ShieldCheck className="h-5 w-5" />
                                                    All Agents Up to Date
                                                </div>
                                            </Button>
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                Fleet synchronized on {LATEST_AGENT_VERSION}
                                            </p>
                                        </div>
                                    ) : (
                                        <Button
                                            size="lg"
                                            onClick={handleRollout}
                                            disabled={isRollingOut || servers.length === 0}
                                            className="h-14 px-10 rounded-2xl bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 font-black uppercase tracking-widest text-sm relative group overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            <div className="relative z-10 flex items-center gap-3">
                                                {isRollingOut ? (
                                                    <>
                                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Triggering...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="h-5 w-5 fill-current" />
                                                        Trigger Rollout to {LATEST_AGENT_VERSION}
                                                    </>
                                                )}
                                            </div>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Form>
    );
}

function ProjectEmailTemplatesSection({ projectId }: { projectId: number }) {
    const { data: templates, isLoading } = useProjectEmailTemplates(projectId);
    const { data: projectSettings } = useProjectAlertSettings(projectId);
    const updateProjectSettings = useUpdateProjectAlertSettings(projectId);
    const updateTemplate = useUpdateProjectEmailTemplate(projectId);
    const deleteTemplate = useDeleteProjectEmailTemplate(projectId);
    const { toast } = useToast();
    const [editingType, setEditingType] = useState<string | null>(null);
    const [alertSubject, setAlertSubject] = useState("");
    const [recoverySubject, setRecoverySubject] = useState("");
    const [editBody, setEditBody] = useState("");
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [isSimpleMode, setIsSimpleMode] = useState(true);
    const [simpleConfig, setSimpleConfig] = useState<any>({
        // Branding Layer (Shared for simplicity, or can be split if needed)
        showLogo: true,
        showCompany: true,
        showFooter: true,
        // Alert State
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showProject: true,
        showResource: true,
        showMetric: true,
        showValue: true,
        showThreshold: true,
        themeColor: "#6366f1",
        badgeText: editingType === "Domain" ? "Expiry Warning" : "Critical Alert",
        titleText: editingType === "Domain" ? "Domain Expiry Alert" : "High usage detected",
        subtitleText: editingType === "Domain" ? "One of your domains is about to expire." : "Your infrastructure requires immediate attention.",
        // Recovery State
        recoveryShowBadge: true,
        recoveryShowTitle: true,
        recoveryShowSubtitle: true,
        recoveryShowProject: true,
        recoveryShowResource: true,
        recoveryShowMetric: true,
        recoveryShowValue: true,
        recoveryShowThreshold: false,
        recoveryThemeColor: "#22c55e",
        recoveryBadgeText: "RECOVERY",
        recoveryTitleText: editingType === "Domain" ? "Domain Active" : "Resource Stabilized",
        recoverySubtitleText: "The resource has returned to a normal state.",
        // Shared
        footerText: "Sent via {{company}} Infrastructure Monitoring",
        layoutTheme: "modern", // modern, industrial, classic
    });

    const [localBranding, setLocalBranding] = useState({
        companyName: "",
        logoUrl: ""
    });

    useEffect(() => {
        if (projectSettings) {
            setLocalBranding({
                companyName: projectSettings.companyName || "",
                logoUrl: projectSettings.logoUrl || ""
            });
        }
    }, [projectSettings]);

    const [previewStatus, setPreviewStatus] = useState<"ALERT" | "RECOVERY">("ALERT");

    const alertTypes = [
        { id: "Server", label: "Server Alerts", description: "Templates for CPU, Memory, and Storage alerts." },
        { id: "Database", label: "Database Alerts", description: "Templates for Database storage and connection alerts." },
        { id: "Web", label: "Web Monitor Alerts", description: "Templates for Web status, response time, and SSL alerts." },
        { id: "Cluster", label: "Cluster Alerts", description: "Templates for K8s cluster CPU and Memory alerts." },
        { id: "Domain", label: "Domain Alerts", description: "Templates for Domain name expiry alerts." },
    ];

    const [expandedSections, setExpandedSections] = useState<string[]>(["content", "metrics"]);
    const toggleSection = (section: string) => {
        setExpandedSections((prev: string[]) =>
            prev.includes(section) ? prev.filter((s: string) => s !== section) : [...prev, section]
        );
    };

    const getC = (key: string) => {
        const isRecovery = previewStatus === "RECOVERY";
        const recoveryKeys = ["showLogo", "showCompany", "showFooter", "showBadge", "showTitle", "showSubtitle", "showProject", "showResource", "showMetric", "showValue", "showThreshold", "themeColor", "badgeText", "titleText", "subtitleText"];
        const fullKey = (isRecovery && recoveryKeys.includes(key)) ? `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
        return simpleConfig[fullKey] !== undefined ? simpleConfig[fullKey] : simpleConfig[key];
    };

    const LAYOUT_PRESETS = [
        { 
            id: 'light', 
            name: 'Modern Light', 
            icon: Sparkles, 
            desc: 'Standard clean light-mode experience',
            config: { layoutTheme: 'light', showBadge: true, showTitle: true, showSubtitle: true, showProject: true, showResource: true, showMetric: true, showValue: true, showThreshold: true } 
        },
        { 
            id: 'dark', 
            name: 'Modern Dark', 
            icon: Shield, 
            desc: 'Sleek dark-mode experience for contrast',
            config: { layoutTheme: 'dark', showBadge: true, showTitle: true, showSubtitle: true, showProject: true, showResource: true, showMetric: true, showValue: true, showThreshold: true } 
        }
    ];

    const applyPreset = (preset: any) => {
        setSimpleConfig((prev: any) => {
            const next = { ...prev };
            Object.entries(preset.config).forEach(([key, val]) => {
                // Apply to Alert mode
                next[key] = val;
                // Apply to Recovery mode (for visibility toggles and theme)
                if (key.startsWith('show') || key === 'layoutTheme') {
                    const recoveryKey = key === 'layoutTheme' ? key : `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                    next[recoveryKey] = val;
                }
            });
            return next;
        });
        toast({
            title: `${preset.name} Applied`,
            description: `Switched to ${preset.id === 'dark' ? 'Dark' : 'Light'} mode design.`
        });
    };

    const updateConfig = (key: string, v: any) => {
        const isRecovery = previewStatus === "RECOVERY";
        const recoveryKeys = ["showLogo", "showCompany", "showFooter", "showBadge", "showTitle", "showSubtitle", "showProject", "showResource", "showMetric", "showValue", "showThreshold", "themeColor", "badgeText", "titleText", "subtitleText"];
        const fullKey = (isRecovery && recoveryKeys.includes(key)) ? `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
        setSimpleConfig((prev: any) => ({ ...prev, [fullKey]: v }));
    };

    const replaceVariables = (text: string, isHtml: boolean = false) => {
        const isRecovery = previewStatus === "RECOVERY";
        const isDomain = editingType === "Domain";
        const primaryColor = isRecovery ? simpleConfig.recoveryThemeColor : (isDomain ? "#f59e0b" : simpleConfig.themeColor || "#dc2626");

        const brands = {
            company: isHtml ? `<span style="color: ${primaryColor}; font-weight: 800; letter-spacing: -0.02em;">${projectSettings?.companyName || "InfraWatch"}</span>` : (projectSettings?.companyName || "InfraWatch"),
            logo: isHtml ? `<img src="${projectSettings?.logoUrl || "https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png"}" alt="Logo" style="max-height: 40px; width: auto; vertical-align: middle;">` : ""
        };

        let processedText = text;
        if (processedText.includes("<!-- ALERT_START -->")) {
            const section = isRecovery ? "RECOVERY" : "ALERT";
            const match = processedText.match(new RegExp(`<!-- ${section}_START -->([\\s\\S]*?)<!-- ${section}_END -->`));
            if (match) processedText = match[1];
        }

        return processedText
            .replace(/{{project}}/g, isHtml ? `<span style="color: ${primaryColor}; font-weight: bold;">Demo Project</span>` : "Demo Project")
            .replace(/{{resource}}/g, isHtml ? `<span style="color: ${primaryColor}; font-weight: bold;">${isDomain ? 'example.com' : 'Demo Server'}</span>` : (isDomain ? 'example.com' : 'Demo Server'))
            .replace(/{{type}}/g, isHtml ? `<span style="color: ${primaryColor}; font-weight: bold;">${isDomain ? 'Domain Expiry' : 'CPU Usage'}</span>` : (isDomain ? 'Domain Expiry' : 'CPU Usage'))
            .replace(/{{value}}/g, isHtml ? `<span style="color: ${isRecovery ? '#22c55e' : '#ef4444'}; font-weight: bold;">${isDomain ? (isRecovery ? '365' : '15') : (isRecovery ? '12' : '86')}</span>` : (isDomain ? (isRecovery ? '365' : '15') : (isRecovery ? '12' : '86')))
            .replace(/{{threshold}}/g, isHtml ? `<span style="color: #64748b; font-weight: bold;">${isDomain ? '30' : '80'}</span>` : (isDomain ? '30' : '80'))
            .replace(/{{status}}/g, isHtml ? `<span style="color: ${isRecovery ? '#22c55e' : '#ef4444'}; font-weight: bold; text-transform: uppercase;">${previewStatus}</span>` : previewStatus)
            .replace(/{{expiry_date}}/g, isHtml ? `<span style="color: ${primaryColor}; font-weight: bold;">2024-12-31</span>` : "2024-12-31")
            .replace(/{{days_left}}/g, isHtml ? `<span style="color: ${isRecovery ? '#22c55e' : '#ef4444'}; font-weight: bold;">${isRecovery ? '365' : '15'}</span>` : (isRecovery ? '365' : '15'))
            .replace(/{{company_name}}/g, brands.company)
            .replace(/{{company}}/g, brands.company)
            .replace(/{{logo}}/g, brands.logo)
            .replace(/{{logo_url}}/g, projectSettings?.logoUrl || "https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png");
    };

    const generateSimpleHtml = (config: any, forcedMode?: "ALERT" | "RECOVERY") => {
        const isDomain = editingType === "Domain";
        const isRecovery = (forcedMode || previewStatus) === "RECOVERY";

        // Helper to get mode-specific value
        const getV = (key: string) => {
            const fullKey = isRecovery ? `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
            return config[fullKey] !== undefined ? config[fullKey] : config[key];
        };

        const primaryColor = isRecovery ? config.recoveryThemeColor : (isDomain ? "#f59e0b" : config.themeColor || "#dc2626");
        const badgeBg = isRecovery ? "#f0fdf4" : (isDomain ? "#fffbeb" : "#fef2f2");
        const badgeBorder = isRecovery ? "#dcfce7" : (isDomain ? "#fef3c7" : "#fee2e2");

        const getUnit = (label: string) => {
            if (isDomain) {
                if (label.includes("Days") || label.includes("Value") || label.includes("Threshold")) return " days";
                return "";
            }
            if (label.toLowerCase().includes("cpu") || label.toLowerCase().includes("memory") || label.toLowerCase().includes("usage") || label.toLowerCase().includes("threshold") || label.toLowerCase().includes("value")) {
                return "%";
            }
            if (editingType === "Web") return " (Status)";
            return "";
        };

        const rows = [
            getV('showProject') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{project}}</td></tr>`,
            getV('showResource') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Domain' : 'Resource'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{resource}}</td></tr>`,
            getV('showMetric') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Status' : 'Metric'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${isDomain ? 'Expiring Soon' : '{{type}}'}</td></tr>`,
            isDomain && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Expiry Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">{{expiry_date}}</td></tr>`,
            getV('showValue') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Days Remaining' : 'Current Value'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${isRecovery ? config.recoveryThemeColor : '#ef4444'}; font-weight: bold;">${isDomain ? '{{days_left}}' : '{{value}}'}${getUnit("Value")}</td></tr>`,
            getV('showThreshold') && !isDomain && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Threshold:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #64748b; font-weight: bold;">{{threshold}}${getUnit("Threshold")}</td></tr>`,
        ].filter(Boolean).join('');

        const showBadge = getV('showBadge');
        const showTitle = getV('showTitle');
        const showSubtitle = getV('showSubtitle');

        const badgeText = isRecovery ? config.recoveryBadgeText : config.badgeText;
        const titleText = isRecovery ? config.recoveryTitleText : config.titleText;
        const subtitleText = isRecovery ? config.recoverySubtitleText : config.subtitleText;

        const persistentConfig = {
            ...config,
            alertSubject: (window as any)._alertSubject,
            recoverySubject: (window as any)._recoverySubject
        };

        const theme = config.layoutTheme || 'light';
        const isDark = theme === 'dark';
        
        const bgColor = isDark ? '#0f172a' : '#ffffff';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const mutedColor = isDark ? '#94a3b8' : '#64748b';
        const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
        const contentBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
        const contentBorder = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

        const showLogo = getV('showLogo');
        const showCompany = getV('showCompany');

        const brandHeader = ((projectSettings?.logoUrl && showLogo) || (projectSettings?.companyName && showCompany)) ? (
            '<table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">' +
            '<tr>' +
            '<td style="text-align: left; vertical-align: middle;">' +
            (projectSettings?.logoUrl && showLogo ? '{{logo}}' : '') +
            '</td>' +
            '<td style="text-align: right; vertical-align: middle;">' +
            (projectSettings?.companyName && showCompany ? '<span style="color: ' + textColor + '; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">{{company_name}}</span>' : '') +
            '</td>' +
            '</tr>' +
            '</table>'
        ) : '';

        const footerMarkup = config.showFooter ? '<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ' + contentBorder + '; text-align: center; color: ' + mutedColor + '; font-size: 11px; font-weight: 500;">' + config.footerText + '</div>' : '';

        const finalRows = rows
            .replace(/#334155/g, isDark ? '#cbd5e1' : '#334155')
            .replace(/#64748b/g, isDark ? '#94a3b8' : '#64748b')
            .replace(/#eee/g, isDark ? 'rgba(255,255,255,0.1)' : '#eee');

        const content = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 16px;">
    ${brandHeader}
    <div style="text-align: center; margin-bottom: 32px;">
        ${showBadge ? (
            '<div style="display: inline-block; padding: 8px 16px; background-color: ' + badgeBg + '; border: 1px solid ' + badgeBorder + '; border-radius: 99px; color: ' + primaryColor + '; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">' +
            badgeText +
            '</div>'
        ) : ''}
        ${showTitle ? '<h1 style="margin: 16px 0 8px; color: ' + textColor + '; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">' + titleText + '</h1>' : ''}
        ${showSubtitle ? '<p style="margin: 0; color: ' + mutedColor + '; font-size: 16px;">' + subtitleText + '</p>' : ''}
    </div>
    <div style="padding: 24px; background-color: ${contentBg}; border-radius: 12px; border: 1px solid ${contentBorder};">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: ${textColor};">
            ${finalRows}
        </table>
    </div>
    ${footerMarkup}
</div>`;

        return content.trim();
    };

    // Auto-update body in simple mode
    useEffect(() => {
        (window as any)._alertSubject = alertSubject;
        (window as any)._recoverySubject = recoverySubject;
        if (isSimpleMode && editingType) {
            const alertBody = generateSimpleHtml(simpleConfig, "ALERT");
            const recoveryBody = generateSimpleHtml(simpleConfig, "RECOVERY");
            
            const persistentConfig = {
                ...simpleConfig,
                alertSubject,
                recoverySubject
            };

            const combined = `<!-- ALERT_START -->\n${alertBody}\n<!-- ALERT_END -->\n<!-- RECOVERY_START -->\n${recoveryBody}\n<!-- RECOVERY_END -->\n\n<!-- SIMPLE_CONFIG: ${JSON.stringify(persistentConfig)} -->`;
            setEditBody(combined);
        }
    }, [simpleConfig, isSimpleMode, editingType, alertSubject, recoverySubject]);

    const handleEdit = (type: string) => {
        const template = templates?.find(t => t.alertType === type);
        const body = template?.body || "";

        // Try to parse simple config from body
        const configMatch = body.match(/<!-- SIMPLE_CONFIG: (.*) -->/);
        if (configMatch) {
            try {
                const config = JSON.parse(configMatch[1]);
                setSimpleConfig({
                    themeColor: "#6366f1",
                    ...config
                });
                if (config.alertSubject) setAlertSubject(config.alertSubject);
                if (config.recoverySubject) setRecoverySubject(config.recoverySubject);
                setIsSimpleMode(true);
            } catch (e) {
                setIsSimpleMode(false);
            }
        } else {
            setIsSimpleMode(!body); // New templates start in simple mode
            if (!body) {
                setSimpleConfig({
                    showLogo: true,
                    showCompany: true,
                    showFooter: true,
                    showBadge: true,
                    showTitle: true,
                    showSubtitle: true,
                    showProject: true,
                    showResource: true,
                    showMetric: true,
                    showValue: true,
                    showThreshold: true,
                    themeColor: "#6366f1",
                    badgeText: type === "Domain" ? "Expiry Warning" : "Critical Alert",
                    titleText: type === "Domain" ? "Domain Expiry Alert" : "High usage detected",
                    subtitleText: type === "Domain" ? "One of your domains is about to expire." : "Your infrastructure requires immediate attention.",
                    footerText: "Sent via {{company}} Infrastructure Monitoring",
                });
                setAlertSubject(`Alert: High {{type}} on {{resource}}`);
                setRecoverySubject(`Fixed: {{type}} on {{resource}} stabilized`);
            } else {
                setAlertSubject(template?.subject || `Alert: High {{type}} on {{resource}}`);
                setRecoverySubject(`Fixed: {{type}} on {{resource}} stabilized`);
            }
        }

        setEditingType(type);
        setEditBody(body);
        setViewMode("edit");
    };

    const handleSave = (closeAfterSave: boolean = true) => {
        if (!editingType) return;
        updateTemplate.mutate({
            alertType: editingType,
            data: {
                subject: alertSubject, // Primary subject column is always the Alert subject
                body: editBody
            }
        }, {
            onSuccess: () => {
                toast({ title: "Template Saved", description: "All design and content changes have been persisted." });
                if (closeAfterSave) {
                    setEditingType(null);
                    setViewMode("edit");
                }
            }
        });
    };

    if (isLoading) return <div className="text-center py-8">Loading templates...</div>;
    return (
        <div className="space-y-4 mt-2">
            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Email Branding</CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Common identity for all email templates</CardDescription>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            className="rounded-xl h-9 px-6 font-bold uppercase tracking-widest text-[10px]"
                            onClick={() => {
                                updateProjectSettings.mutate(localBranding, {
                                    onSuccess: () => toast({ title: "Branding Updated", description: "All templates will now use this common identity." })
                                });
                            }}
                            disabled={updateProjectSettings.isPending}
                        >
                            <Save className="h-3.5 w-3.5 mr-2" /> Save Branding
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Global Logo URL</Label>
                        <div className="relative">
                            <Input 
                                placeholder="https://..." 
                                value={localBranding.logoUrl}
                                onChange={(e) => setLocalBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                                className="h-11 rounded-2xl bg-background border-border/40 pl-10 pr-4 font-mono text-xs"
                            />
                            <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Global Brand Label</Label>
                        <div className="relative">
                            <Input 
                                placeholder="e.g. Acme Corp" 
                                value={localBranding.companyName}
                                onChange={(e) => setLocalBranding(prev => ({ ...prev, companyName: e.target.value }))}
                                className="h-11 rounded-2xl bg-background border-border/40 pl-10 pr-4 font-bold"
                            />
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Send className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Email Templates</CardTitle>
                            <CardDescription>Customize alert emails for this project. If not set, system defaults will be used.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alertTypes.map((type) => {
                        const hasCustom = templates?.some(t => t.alertType === type.id);
                        return (
                            <div key={type.id} className="relative p-6 rounded-3xl border border-border/40 bg-card/30 hover:bg-card/50 transition-all group overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 p-4">
                                    {hasCustom ? (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                            Customized
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted text-muted-foreground/60 rounded-full border border-border/40 text-[9px] font-black uppercase tracking-widest">
                                            System Default
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 flex-1">
                                    <div className="mb-4">
                                        <h4 className="font-black text-lg tracking-tight text-foreground/90">{type.label}</h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{type.description}</p>
                                    </div>
                                    <div className="mt-auto flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                                            onClick={() => handleEdit(type.id)}
                                        >
                                            {hasCustom ? "Edit Template" : "Customize"}
                                        </Button>
                                        {hasCustom && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all"
                                                onClick={() => {
                                                    if (confirm("Reset to system default template?")) {
                                                        deleteTemplate.mutate(type.id, {
                                                            onSuccess: () => toast({ title: "Reset", description: "Template reset to system default." })
                                                        });
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent className="sm:max-w-[1400px] w-[94vw] border-border/40 bg-card/95 backdrop-blur-xl rounded-[3rem] overflow-hidden p-0 flex flex-col h-[92vh] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-500 scale-100">
                    <DialogHeader className="pt-6 px-8 shrink-0">
                        <div className="flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/10">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight">
                                    Configure {alertTypes.find(a => a.id === editingType)?.label}
                                </DialogTitle>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black text-[9px] uppercase tracking-widest px-4 transition-all active:scale-95">
                                        <Info className="h-3.5 w-3.5" /> Variable Guide
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-5 rounded-[2rem] border-border/40 shadow-2xl bg-white/95 backdrop-blur-md" align="end">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Terminal className="h-4 w-4 text-primary" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-primary">Documentation</h4>
                                    </div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] border-b pb-1">Dynamic Values</p>
                                            <div className="grid gap-2 text-[10px]">
                                                {["project", "resource", "type", "value", "threshold", "status", "expiry_date"].map(v => (
                                                    <div key={v} className="flex flex-col gap-0.5 p-1.5 hover:bg-muted/30 rounded-lg transition-colors group">
                                                        <code className="font-black text-primary/80 group-hover:text-primary transition-colors">{"{{"}{v}{"}}"}</code>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <DialogDescription className="text-muted-foreground/80 font-medium">
                            {isSimpleMode ? "Use the toggles below to customize your template without writing code." : "Edit the raw HTML below to create a fully custom email design."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden px-6 pb-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                            {/* LEFT COLUMN: CONFIGURATION */}
                            <div className="lg:col-span-6 flex flex-col h-full bg-muted/20 rounded-[2rem] border border-border/40 overflow-hidden shadow-inner">
                                <Tabs defaultValue="design" className="flex flex-col h-full focus:outline-none">
                                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1.5 h-11 shrink-0 rounded-none border-b border-border/20">
                                        <TabsTrigger value="design" className="text-[10px] font-black uppercase tracking-widest h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all focus:outline-none">Design</TabsTrigger>
                                        <TabsTrigger value="content" className="text-[10px] font-black uppercase tracking-widest h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all focus:outline-none">Content</TabsTrigger>
                                    </TabsList>

                                    <div className="flex-1 flex flex-col min-h-0">
                                        {/* DESIGN TAB */}
                                        <TabsContent value="design" className="m-0 p-6 outline-none focus:outline-none flex-1 data-[state=active]:flex data-[state=active]:flex-col h-full overflow-hidden">
                                            <div className="flex flex-col h-full justify-between gap-4 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                {/* SECTION 1: VISUAL IDENTITY */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Branding & Layout</Label>
                                                            {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                        </div>
                                                        <div className="h-[1px] flex-1 mx-4 bg-border/20" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            { key: "showLogo", label: "Logo Presence", icon: ImageIcon },
                                                            { key: "showCompany", label: "Brand Label", icon: Building2 },
                                                        ].map(item => (
                                                            <div key={item.key} className="flex flex-col gap-3 p-5 rounded-2xl bg-background border border-border/40 hover:border-primary/30 transition-all shadow-sm group">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                                            <item.icon className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <Label className="text-[11px] font-bold uppercase tracking-tight">{item.label}</Label>
                                                                    </div>
                                                                    <Switch checked={getC(item.key)} onCheckedChange={(v) => updateConfig(item.key, v)} className="scale-90" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* SECTION 1.5: LAYOUT TEMPLATES (PRESETS) */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Email Themes</Label>
                                                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-primary/5 text-primary rounded-full border border-primary/20 text-[8px] font-bold uppercase tracking-widest">Design</div>
                                                        </div>
                                                        <div className="h-[1px] flex-1 mx-4 bg-border/20" />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2.5">
                                                        {LAYOUT_PRESETS.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={() => applyPreset(preset)}
                                                                className="flex items-center gap-4 p-4 rounded-3xl bg-background border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
                                                            >
                                                                <div className="p-3 rounded-2xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
                                                                    <preset.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 flex-1">
                                                                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{preset.name}</span>
                                                                    <span className="text-[9px] text-muted-foreground font-medium leading-relaxed opacity-60 group-hover:opacity-100">{preset.desc}</span>
                                                                </div>
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground/30 -rotate-90 group-hover:text-primary/50 group-hover:translate-x-1 transition-all" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* SECTION 3: THEME */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Theme Aesthetics</Label>
                                                            {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                        </div>
                                                        <div className="h-[1px] flex-1 mx-4 bg-border/20" />
                                                    </div>
                                                    <div className="flex gap-5 px-4 items-center justify-center py-1">
                                                        {["#dc2626", "#2563eb", "#9333ea", "#16a34a", "#f59e0b", "#0f172a"].map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => updateConfig("themeColor", color)}
                                                                className={`h-9 w-9 rounded-full border-2 transition-all hover:scale-125 active:scale-90 ${getC("themeColor") === color ? 'border-primary ring-4 ring-primary/10 shadow-xl scale-110' : 'border-transparent shadow-sm hover:border-border/60'}`}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        </TabsContent>

                                        {/* CONTENT TAB */}
                                        <TabsContent value="content" className="m-0 p-8 outline-none focus:outline-none flex-1 overflow-y-auto">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Subject Header</Label>
                                                        {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                    </div>
                                                    <Input
                                                        value={previewStatus === "RECOVERY" ? recoverySubject : alertSubject}
                                                        onChange={(e) => previewStatus === "RECOVERY" ? setRecoverySubject(e.target.value) : setAlertSubject(e.target.value)}
                                                        className="h-11 text-xs rounded-[1.25rem] bg-background border-border/60 font-medium px-4"
                                                    />
                                                </div>
                                                <div className="grid gap-4">
                                                    <div className="grid gap-3 p-5 bg-background/50 rounded-[2rem] border border-border/40">
                                                        <div className="flex justify-between items-center px-1">
                                                            <div className="flex items-center gap-3">
                                                                <Label className="text-[11px] font-black uppercase tracking-tight">Badge Label</Label>
                                                                {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                            </div>
                                                            <Switch checked={getC("showBadge")} onCheckedChange={(v) => updateConfig("showBadge", v)} />
                                                        </div>
                                                        {getC("showBadge") && <Input value={getC("badgeText")} onChange={(e) => updateConfig("badgeText", e.target.value)} className="h-10 text-xs rounded-xl bg-background border-border" />}
                                                    </div>
                                                    <div className="grid gap-3 p-5 bg-background/50 rounded-[2rem] border border-border/40">
                                                        <div className="flex justify-between items-center px-1">
                                                            <div className="flex items-center gap-3">
                                                                <Label className="text-[11px] font-black uppercase tracking-tight">Main Heading</Label>
                                                                {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                            </div>
                                                            <Switch checked={getC("showTitle")} onCheckedChange={(v) => updateConfig("showTitle", v)} />
                                                        </div>
                                                        {getC("showTitle") && <Input value={getC("titleText")} onChange={(e) => updateConfig("titleText", e.target.value)} className="h-10 text-xs rounded-xl bg-background border-border font-bold" />}
                                                    </div>
                                                    <div className="grid gap-3 p-5 bg-background/50 rounded-[2rem] border border-border/40">
                                                        <div className="flex justify-between items-center px-1">
                                                            <div className="flex items-center gap-3">
                                                                <Label className="text-[11px] font-black uppercase tracking-tight">Sub-Text Content</Label>
                                                                {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                            </div>
                                                            <Switch checked={getC("showSubtitle")} onCheckedChange={(v) => updateConfig("showSubtitle", v)} />
                                                        </div>
                                                        {getC("showSubtitle") && <Input value={getC("subtitleText")} onChange={(e) => updateConfig("subtitleText", e.target.value)} className="h-10 text-xs rounded-xl bg-background border-border font-medium text-muted-foreground" />}
                                                    </div>

                                                </div>

                                                {/* SECTION 4: DATA PRECISION (MIGRATED) */}
                                                <div className="space-y-4 pt-4 border-t border-border/10">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Data Component Visibility</Label>
                                                            {previewStatus === "RECOVERY" && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase tracking-widest border border-emerald-500/20">Recovery Mode</span>}
                                                        </div>
                                                        <div className="h-[1px] flex-1 mx-4 bg-border/20" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { key: "showProject", label: "Project ID" },
                                                            { key: "showResource", label: "Resource" },
                                                            { key: "showMetric", label: "Metric" },
                                                            { key: "showValue", label: "Current Value" },
                                                            { key: "showThreshold", label: "Threshold", disabled: editingType === "Domain" }
                                                        ].filter(m => !m.disabled).map(item => (
                                                            <div key={item.key} className="flex items-center justify-between p-3.5 bg-background/50 border border-border/40 hover:border-primary/20 rounded-xl transition-all group">
                                                                <Label className="text-[9px] font-black uppercase text-muted-foreground group-hover:text-foreground/90 transition-colors tracking-widest">{item.label}</Label>
                                                                <Switch checked={getC(item.key)} onCheckedChange={(v) => updateConfig(item.key, v)} className="scale-[0.7] origin-right" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 p-5 bg-background/50 rounded-[2rem] border border-border/40">
                                                    <div className="flex justify-between items-center px-1">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="text-[11px] font-black uppercase tracking-tight">Footer Information</Label>
                                                        </div>
                                                        <Switch checked={getC("showFooter")} onCheckedChange={(v) => updateConfig("showFooter", v)} />
                                                    </div>
                                                    {getC("showFooter") && (
                                                        <div className="space-y-1.5 px-0.5 animate-in slide-in-from-top-2 duration-300">
                                                            <Label className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-widest block">Footer Copyright Text</Label>
                                                            <Input 
                                                                value={simpleConfig.footerText} 
                                                                onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, footerText: e.target.value }))}
                                                                placeholder="Sent via {{company}} Infrastructure Monitoring..."
                                                                className="h-10 text-xs rounded-xl bg-background border-border"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TabsContent>

                                    </div>

                                    <div className="p-6 border-t border-border/10 bg-muted/20 shrink-0">
                                        <div className="flex gap-4">
                                            <Button variant="outline" className="flex-[0.5] rounded-[1.75rem] h-12 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-muted transition-all" onClick={() => setEditingType(null)}>Discard</Button>
                                            <Button
                                                variant="secondary"
                                                className="flex-1 rounded-[1.75rem] h-12 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-border/20 transition-all border"
                                                onClick={() => handleSave(false)}
                                                disabled={updateTemplate.isPending}
                                            >
                                                {updateTemplate.isPending ? "Saving..." : "Save Changes"}
                                            </Button>
                                            <Button className="flex-1 rounded-[1.75rem] h-12 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={() => handleSave(true)} disabled={updateTemplate.isPending}>
                                                {updateTemplate.isPending ? "Saving..." : "Submit & Finish"}
                                            </Button>
                                        </div>
                                    </div>
                                </Tabs>
                            </div>


                            {/* RIGHT COLUMN: PREVIEW */}
                            <div className="lg:col-span-6 flex flex-col h-full space-y-4">
                                <div className="flex items-center justify-between px-3 shrink-0">
                                    <div className="flex flex-col">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Live Preview</Label>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${previewStatus === "RECOVERY" ? "bg-emerald-500" : "bg-destructive"}`} />
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">{previewStatus === "RECOVERY" ? "Recovery State" : "Alert State"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center p-1 bg-muted/50 border border-border/40 rounded-[1.25rem] shadow-inner">
                                        <button
                                            onClick={() => setPreviewStatus("ALERT")}
                                            className={`px-4 py-1.5 rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all ${previewStatus === "ALERT" ? 'bg-destructive/10 text-destructive shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
                                        >
                                            Alert
                                        </button>
                                        <button
                                            onClick={() => setPreviewStatus("RECOVERY")}
                                            className={`px-4 py-1.5 rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all ${previewStatus === "RECOVERY" ? 'bg-emerald-500/10 text-emerald-500 shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
                                        >
                                            Recovery
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 rounded-[3rem] border border-border/40 overflow-hidden bg-slate-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative flex flex-col min-h-0">
                                    {/* BROWSER TOP BAR */}
                                    <div className="h-12 bg-slate-800/90 border-b border-white/5 flex items-center px-6 gap-6 shrink-0 relative z-10">
                                        <div className="flex gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-600/50" />
                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-600/50" />
                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-600/50" />
                                        </div>
                                        <div className="flex-1 bg-slate-900/80 rounded-xl h-7 flex items-center px-4 text-[10px] text-slate-400 font-mono truncate border border-white/5 shadow-inner">
                                            <span className="opacity-40 mr-2">Subject:</span> {replaceVariables(previewStatus === "RECOVERY" ? recoverySubject : alertSubject)}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto bg-[#f1f5f9] p-10">
                                        <div className="mx-auto max-w-[100%] shadow-2xl rounded-[1.5rem] overflow-hidden bg-white hover:scale-[1.01] transition-transform duration-500">
                                            <div dangerouslySetInnerHTML={{ __html: replaceVariables(editBody || "", true) }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============================================================
// ALERT HISTORY TAB
// ============================================================
function AlertHistoryTab({ projectId }: { projectId: number }) {
    const [alertHistory, setAlertHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'server' | 'database' | 'cluster' | 'web' | 'domain'>('all');

    useEffect(() => {
        setIsLoading(true);
        fetch(`/api/projects/${projectId}/alerts/history`)
            .then(r => r.json())
            .then(data => { setAlertHistory(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, [projectId]);

    const typeColors: Record<string, string> = {
        cpu: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        memory: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        storage: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        db_storage: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        db_connections: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
        web_status: 'text-red-500 bg-red-500/10 border-red-500/20',
        web_response: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        web_ssl: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        cluster_cpu: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
        cluster_memory: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        domain_expiry: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    };

    const resourceTypeIcon: Record<string, any> = {
        server: Server, database: Database, cluster: Cloud, web: Globe, domain: Globe
    };

    const filtered = alertHistory.filter(a => {
        // Status filter
        if (statusFilter === 'active' && !!a.resolvedAt) return false;
        if (statusFilter === 'resolved' && !a.resolvedAt) return false;

        // Type filter
        if (typeFilter !== 'all' && a.resourceType !== typeFilter) return false;

        return true;
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-40 text-muted-foreground animate-pulse">
            Loading alert history...
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Alert History</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Filter by status and resource type to track your infrastructure health.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 px-4 bg-muted/20 border border-border/40 rounded-2xl gap-8 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filter Type</span>
                        <div className="flex gap-1.5">
                            {(['all', 'server', 'database', 'cluster', 'web', 'domain'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTypeFilter(f)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                                        typeFilter === f
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20"
                                            : "bg-background text-muted-foreground border-border/40 hover:bg-muted/60"
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                        <div className="flex gap-1.5">
                            {(['all', 'active', 'resolved'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                                        statusFilter === f
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                                            : "bg-background text-muted-foreground border-border/40 hover:bg-muted/60"
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/40 rounded-3xl text-muted-foreground bg-muted/10">
                    <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                    <p className="font-bold tracking-tight">No alerts found</p>
                    <p className="text-xs mt-1 opacity-70">All systems are healthy!</p>
                </div>
            ) : (
                <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40 border-b border-border/40">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-6">Resource</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Type</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Value / Threshold</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Alerted At</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Resolved At</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((alert: any) => {
                                const Icon = resourceTypeIcon[alert.resourceType] || Server;
                                const typeColor = typeColors[alert.type] || 'text-foreground bg-muted border-border';
                                const isResolved = !!alert.resolvedAt;
                                return (
                                    <TableRow key={alert.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                        <TableCell className="pl-6 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Icon className="h-3.5 w-3.5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{alert.resourceName}</p>
                                                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">{alert.resourceType}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                                                typeColor
                                            )}>
                                                {alert.type.replace(/_/g, ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3 font-mono text-sm">
                                            {(() => {
                                                const val = Math.round(alert.value);
                                                const thr = Math.round(alert.threshold);
                                                if (alert.type === 'web_status') {
                                                    return (
                                                        <>
                                                            <span className={cn("font-bold", val === 0 ? "text-destructive" : "text-emerald-500")}>
                                                                {val === 0 ? "DOWN" : "UP"}
                                                            </span>
                                                            <span className="text-muted-foreground mx-1">/</span>
                                                            <span className="text-muted-foreground">UP</span>
                                                        </>
                                                    );
                                                }
                                                const unit = alert.type.includes('response') ? 'ms' :
                                                    alert.type.includes('expiry') || alert.type.includes('ssl') ? 'd' :
                                                        alert.type.includes('connections') ? '' : '%';

                                                return (
                                                    <>
                                                        <span className="text-destructive font-bold">{val}{unit}</span>
                                                        <span className="text-muted-foreground mx-1">/</span>
                                                        <span className="text-muted-foreground">{thr}{unit}</span>
                                                    </>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="py-3 text-xs text-muted-foreground">
                                            {alert.sentAt ? format(new Date(alert.sentAt), "MMM dd, HH:mm:ss") : "—"}
                                        </TableCell>
                                        <TableCell className="py-3 text-xs">
                                            {isResolved ? (
                                                <span className="text-emerald-500 font-medium">{format(new Date(alert.resolvedAt), "MMM dd, HH:mm:ss")}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">Still active</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {isResolved ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                    <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-red-500/10 text-red-500 border-red-500/20">
                                                    <Bell className="h-2.5 w-2.5" /> Active
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

// ============================================================
// ALERT MUTING TAB
// ============================================================
function AlertMutingTab({ projectId, settings }: { projectId: number; settings: any }) {
    const { data: resources } = useProjectResources(projectId);
    const { toast } = useToast();
    const [muted, setMuted] = useState<Record<string, number[]>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);

    useEffect(() => {
        if (settings?.alertMutedResources) {
            setMuted(settings.alertMutedResources as any || {});
        }
    }, [settings]);

    const toggleMute = (category: string, id: number) => {
        setMuted(prev => {
            const current = prev[category] || [];
            const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
            return { ...prev, [category]: next };
        });
    };

    const isMuted = (category: string, id: number) => (muted[category] || []).includes(id);

    const toggleSection = (key: string) => {
        setExpandedSections(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alert-muting`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertMutedResources: muted }),
            });
            if (!res.ok) throw new Error('Failed');
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/alert-settings`] });
            toast({ title: "Alert muting saved", description: "Changes will take effect on the next metric check." });
        } catch {
            toast({ title: "Failed to save", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const sections = [
        { key: 'servers', label: 'Servers', icon: Server, color: 'text-blue-500 bg-blue-500/10', items: resources?.servers || [] },
        { key: 'databases', label: 'Databases', icon: Database, color: 'text-emerald-500 bg-emerald-500/10', items: resources?.databases || [] },
        { key: 'clusters', label: 'Clusters', icon: Cloud, color: 'text-amber-500 bg-amber-500/10', items: resources?.clusters || [] },
        { key: 'webMonitors', label: 'Web Monitors', icon: Globe, color: 'text-purple-500 bg-purple-500/10', items: resources?.webMonitors || [] },
        { key: 'domainMonitors', label: 'Domain Monitors', icon: Globe, color: 'text-indigo-500 bg-indigo-500/10', items: resources?.domainMonitors || [] },
    ];

    const totalResources = sections.reduce((acc, s) => acc + s.items.length, 0);
    const totalMuted = Object.values(muted).flat().length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-black tracking-tight">Alert Muting</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Expand categories to toggle alerting on/off per resource.
                        {totalMuted > 0 && <span className="ml-2 text-amber-500 font-bold">{totalMuted} resource{totalMuted !== 1 ? 's' : ''} muted</span>}
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-xl font-bold px-6 bg-primary shadow-lg shadow-primary/20"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {totalResources === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/40 rounded-3xl text-muted-foreground bg-muted/10">
                    <Server className="h-10 w-10 mb-3 opacity-20" />
                    <p className="font-bold tracking-tight">No resources found</p>
                    <p className="text-xs mt-1 opacity-70">Add resources to this project first.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {sections.map(section => {
                        if (section.items.length === 0) return null;
                        const Icon = section.icon;
                        const sectionMuted = (muted[section.key] || []).length;
                        const isExpanded = expandedSections.includes(section.key);

                        return (
                            <div key={section.key} className="group border border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300">
                                <div
                                    className={cn(
                                        "flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none",
                                        isExpanded && "bg-muted/20 border-b border-border/40"
                                    )}
                                    onClick={() => toggleSection(section.key)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                                            isExpanded ? section.color : "bg-muted/50 text-muted-foreground"
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-sm font-black uppercase tracking-widest">{section.label}</CardTitle>
                                                <span className="text-[10px] font-bold bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                                                    {section.items.length}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                {sectionMuted > 0 ? (
                                                    <span className="text-amber-500 font-bold">{sectionMuted} muted resources</span>
                                                ) : (
                                                    "All alerts enabled"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[10px] font-bold uppercase tracking-widest h-7 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const allMuted = section.items.every((item: any) => isMuted(section.key, item.id));
                                                setMuted(prev => ({
                                                    ...prev,
                                                    [section.key]: allMuted ? [] : section.items.map((item: any) => item.id)
                                                }));
                                            }}
                                        >
                                            {section.items.every((item: any) => isMuted(section.key, item.id)) ? "Unmute All" : "Mute All"}
                                        </Button>
                                        <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 bg-muted/10 divide-y divide-border/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {section.items.map((item: any) => {
                                            const name = item.name || item.hostname || item.domain || `ID ${item.id}`;
                                            const resourceIsMuted = isMuted(section.key, item.id);
                                            return (
                                                <div key={item.id} className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-background/40 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center transition-all shadow-sm",
                                                            resourceIsMuted ? "bg-muted text-muted-foreground shadow-none" : section.color
                                                        )}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className={cn("font-bold text-sm transition-all", resourceIsMuted && "text-muted-foreground line-through opacity-70")}>{name}</p>
                                                                {resourceIsMuted && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                                        <VolumeX className="h-2 w-2" /> Muted
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(item.hostname || item.url || item.domain) && (
                                                                <p className="text-[10px] font-mono text-muted-foreground opacity-60 truncate max-w-[200px]">
                                                                    {item.hostname || item.url || item.domain}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-[10px] font-black uppercase tracking-wider transition-colors", resourceIsMuted ? "text-muted-foreground" : "text-emerald-500")}>
                                                            {resourceIsMuted ? "Muted" : "Active"}
                                                        </span>
                                                        <Switch
                                                            checked={!resourceIsMuted}
                                                            onCheckedChange={() => toggleMute(section.key, item.id)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
