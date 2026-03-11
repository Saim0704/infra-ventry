import { useProjectResources, useUpdateProject, useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useDeleteServer } from "@/hooks/use-servers";
import { useDeleteDatabase } from "@/hooks/use-databases";
import { useDeleteCluster } from "@/hooks/use-clusters";
import { useDeleteWebMonitor } from "@/hooks/use-web-monitors";
import { useCreateToken } from "@/hooks/use-tokens";
import { useProjectAlertSettings, useUpdateProjectAlertSettings, useProjectEmailTemplates, useUpdateProjectEmailTemplate } from "@/hooks/use-project-settings";
import { useLocation, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Server, Database, Cloud, Edit, Edit2, Trash2, ChevronLeft, Plus, ChevronDown, Shield, Bell, Activity, Layout, Eye, Terminal, Mail, Save, Key, Send, ExternalLink, Settings, AlertTriangle, Check, X, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-muted/50 p-1 rounded-2xl h-auto md:h-14 border border-border/40 gap-1 md:gap-0">
                    <TabsTrigger value="servers" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Server className="w-4 h-4 mr-2" /> Servers ({servers.length})
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
                    <TabsTrigger value="databases" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Database className="w-4 h-4 mr-2" /> Databases ({databases.length})
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
                    <TabsTrigger value="clusters" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Cloud className="w-4 h-4 mr-2" /> Clusters ({clusters.length})
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
                    <TabsTrigger value="web" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Activity className="w-4 h-4 mr-2" /> Web ({webMonitors.length})
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
                    <TabsTrigger value="domains" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Globe className="w-4 h-4 mr-2" /> Domains ({domainMonitors?.length || 0})
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-xl h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                        <Shield className="w-4 h-4 mr-2" /> Settings
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                    </TabsTrigger>
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
                                                        label={`${server.totalRam} GB`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <UsageBar
                                                        value={lastMetric?.diskUsage || 0}
                                                        label={`${server.totalDisk} GB`}
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

function ThresholdField({ control, name, label, min = 0, max = 100, step = 1, unit = "%" }: any) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center mb-1">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{label}</FormLabel>
                        <span className="font-bold text-primary text-xs">{field.value}{unit}</span>
                    </div>
                    <FormControl>
                        <Input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            className="accent-primary h-1.5 cursor-pointer"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
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

function ProjectSettings({ projectId }: { projectId: number }) {
    const { data: settings, isLoading } = useProjectAlertSettings(projectId);
    const updateSettings = useUpdateProjectAlertSettings(projectId);
    const { toast } = useToast();
    const [newRecipient, setNewRecipient] = useState("");
    const [testEmailRecipient, setTestEmailRecipient] = useState("");
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [subTab, setSubTab] = useState(() => localStorage.getItem(`project_${projectId}_subtab`) || "alerts");

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
        },
        values: settings ? {
            ...settings,
            alertRecipients: (settings.alertRecipients || []).map((email: string) => ({ email }))
        } : undefined
    });

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
            <form onSubmit={form.handleSubmit((data) => {
                const submissionData = {
                    ...data,
                    alertRecipients: (data.alertRecipients || []).map((r: any) => r.email)
                };
                updateSettings.mutate(submissionData, {
                    onSuccess: () => {
                        toast({ title: "Success", description: "Project settings updated successfully." });
                    }
                });
            })} className="space-y-6">
                <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-muted/30 p-1 rounded-xl h-auto md:h-11 border border-border/20 mb-8 gap-1 md:gap-0">
                        <TabsTrigger value="thresholds" className="rounded-lg h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                            <Activity className="w-3.5 h-3.5 mr-2" /> Alert Threshold
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                        </TabsTrigger>
                        <TabsTrigger value="recipients" className="rounded-lg h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                            <Bell className="w-3.5 h-3.5 mr-2" /> Alert Recipient
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                        </TabsTrigger>
                        <TabsTrigger value="smtp" className="rounded-lg h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                            <Mail className="w-3.5 h-3.5 mr-2" /> SMTP Configuration
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="rounded-lg h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                            <Send className="w-3.5 h-3.5 mr-2" /> Email Template
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                        </TabsTrigger>
                        <TabsTrigger value="status" className="rounded-lg h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold tracking-tight relative group transition-all">
                            <Layout className="w-3.5 h-3.5 mr-2" /> Status Page Setting
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 data-[state=active]:group-data-[state=active]:opacity-100 transition-all" />
                        </TabsTrigger>
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
                                <CardContent className="space-y-5">
                                    <ThresholdField control={form.control} name="cpuThreshold" label="CPU Load" />
                                    <ThresholdField control={form.control} name="memoryThreshold" label="Memory" />
                                    <ThresholdField control={form.control} name="storageThreshold" label="Storage" />
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
                                <CardContent className="space-y-5">
                                    <ThresholdField control={form.control} name="dbStorageThreshold" label="Disk Usage" />
                                    <ThresholdField control={form.control} name="dbConnectionThreshold" label="Connections" max={500} unit="" />
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
                                <CardContent className="space-y-5">
                                    <ThresholdField control={form.control} name="clusterCpuThreshold" label="CPU Overload" />
                                    <ThresholdField control={form.control} name="clusterMemoryThreshold" label="Memory High" />
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
                                <CardContent className="space-y-5">
                                    <ThresholdField control={form.control} name="webResponseThreshold" label="Latency" max={10000} step={100} unit="ms" />
                                    <ThresholdField control={form.control} name="webSslExpiryThreshold" label="SSL Expiry" max={90} step={1} unit=" days" />
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
                                <CardContent className="space-y-5">
                                    <ThresholdField control={form.control} name="domainExpiryThreshold" label="Domain Expiry" max={90} step={1} unit=" days" />
                                </CardContent>
                            </Card>
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
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Button type="submit" className="w-full h-12 rounded-xl bg-primary shadow-lg shadow-primary/10 font-bold uppercase tracking-wider" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? "Saving..." : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Project Settings
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}

function ProjectEmailTemplatesSection({ projectId }: { projectId: number }) {
    const { data: templates, isLoading } = useProjectEmailTemplates(projectId);
    const updateTemplate = useUpdateProjectEmailTemplate(projectId);
    const { toast } = useToast();
    const [editingType, setEditingType] = useState<string | null>(null);
    const [editSubject, setEditSubject] = useState("");
    const [editBody, setEditBody] = useState("");
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [isSimpleMode, setIsSimpleMode] = useState(true);
    const [simpleConfig, setSimpleConfig] = useState({
        showLogo: true,
        showProject: true,
        showResource: true,
        showMetric: true,
        showValue: true,
        showThreshold: true,
        showCompany: true,
    });

    const alertTypes = [
        { id: "Server", label: "Server Alerts", description: "Templates for CPU, Memory, and Storage alerts." },
        { id: "Database", label: "Database Alerts", description: "Templates for Database storage and connection alerts." },
        { id: "Web", label: "Web Monitor Alerts", description: "Templates for Web status, response time, and SSL alerts." },
        { id: "Cluster", label: "Cluster Alerts", description: "Templates for K8s cluster CPU and Memory alerts." },
        { id: "Domain", label: "Domain Alerts", description: "Templates for Domain name expiry alerts." },
    ];

    const replaceVariables = (text: string, isHtml: boolean = false) => {
        const brands = {
            company: isHtml ? '<span style="color: #6366f1; font-weight: 800; letter-spacing: -0.02em;">InfraWatch</span>' : "InfraWatch",
            logo: isHtml ? '<img src="https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png" alt="Logo" style="max-height: 40px; width: auto; vertical-align: middle;">' : ""
        };

        return text
            .replace(/{{project}}/g, isHtml ? '<span style="color: #6366f1; font-weight: bold;">Demo Project</span>' : "Demo Project")
            .replace(/{{resource}}/g, isHtml ? '<span style="color: #6366f1; font-weight: bold;">Demo Server</span>' : "Demo Server")
            .replace(/{{type}}/g, isHtml ? '<span style="color: #6366f1; font-weight: bold;">CPU</span>' : "CPU")
            .replace(/{{value}}/g, isHtml ? '<span style="color: #ef4444; font-weight: bold;">86%</span>' : "86%")
            .replace(/{{threshold}}/g, isHtml ? '<span style="color: #10b981; font-weight: bold;">80%</span>' : "80%")
            .replace(/{{company}}/g, brands.company)
            .replace(/{{company_name}}/g, brands.company)
            .replace(/{{logo}}/g, brands.logo)
            .replace(/{{logo_url}}/g, "https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png");
    };

    const generateSimpleHtml = (config: typeof simpleConfig) => {
        const rows = [
            config.showProject && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{project}}</td></tr>`,
            config.showResource && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Resource:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{resource}}</td></tr>`,
            config.showMetric && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Metric:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{type}}</td></tr>`,
            config.showValue && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Current Value:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #ef4444; font-weight: bold;">{{value}}</td></tr>`,
            config.showThreshold && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Threshold:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #10b981; font-weight: bold;">{{threshold}}</td></tr>`,
        ].filter(Boolean).join('');

        return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
    ${(config.showLogo || config.showCompany) ? `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
        <tr>
            <td style="text-align: left; vertical-align: middle;">
                ${config.showLogo ? `{{logo}}` : ''}
            </td>
            <td style="text-align: right; vertical-align: middle;">
                ${config.showCompany ? `<span style="color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">{{company_name}}</span>` : ''}
            </td>
        </tr>
    </table>` : ''}
    <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; padding: 8px 16px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 99px; color: #dc2626; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
            Critical Alert
        </div>
        <h1 style="margin: 16px 0 8px; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">High usage detected</h1>
        <p style="margin: 0; color: #64748b; font-size: 16px;">Your infrastructure requires immediate attention.</p>
    </div>
    <div style="padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            ${rows}
        </table>
    </div>
    ${config.showCompany ? `<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">Sent via <strong>{{company}}</strong> Infrastructure Monitoring</div>` : ''}
</div>
<!-- SIMPLE_CONFIG: ${JSON.stringify(config)} -->`.trim();
    };

    // Auto-update body in simple mode
    useEffect(() => {
        if (isSimpleMode && editingType) {
            setEditBody(generateSimpleHtml(simpleConfig));
        }
    }, [simpleConfig, isSimpleMode, editingType]);

    const handleEdit = (type: string) => {
        const template = templates?.find(t => t.alertType === type);
        const body = template?.body || "";

        // Try to parse simple config from body
        const configMatch = body.match(/<!-- SIMPLE_CONFIG: (.*) -->/);
        if (configMatch) {
            try {
                const config = JSON.parse(configMatch[1]);
                setSimpleConfig(config);
                setIsSimpleMode(true);
            } catch (e) {
                setIsSimpleMode(false);
            }
        } else {
            setIsSimpleMode(!body); // New templates start in simple mode
            if (!body) setSimpleConfig({
                showLogo: true,
                showProject: true,
                showResource: true,
                showMetric: true,
                showValue: true,
                showThreshold: true,
                showCompany: true,
            });
        }

        setEditingType(type);
        setEditSubject(template?.subject || `Alert: High {{type}} on {{resource}}`);
        setEditBody(body);
        setViewMode("edit");
    };

    const handleSave = () => {
        if (!editingType) return;
        updateTemplate.mutate({
            alertType: editingType,
            data: { subject: editSubject, body: editBody }
        }, {
            onSuccess: () => {
                toast({ title: "Success", description: `${editingType} template updated.` });
                setEditingType(null);
                setViewMode("edit");
            }
        });
    };

    if (isLoading) return <div className="text-center py-8">Loading templates...</div>;

    return (
        <div className="space-y-4 mt-2">
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
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alertTypes.map((type) => {
                            const hasCustom = templates?.some(t => t.alertType === type.id);
                            return (
                                <div key={type.id} className="p-4 rounded-2xl border border-border/40 bg-background/30 hover:bg-background/50 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm tracking-tight">{type.label}</h4>
                                        {hasCustom && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-4 line-clamp-2">{type.description}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                                        onClick={() => handleEdit(type.id)}
                                    >
                                        {hasCustom ? "Edit Template" : "Configure"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent className="sm:max-w-[800px] border-border/40 bg-card/95 backdrop-blur-xl rounded-3xl overflow-hidden p-0">
                    <DialogHeader className="pt-8 px-8">
                        <div className="flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    Configure {alertTypes.find(a => a.id === editingType)?.label}
                                </DialogTitle>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 gap-2 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all font-black text-[9px] uppercase tracking-widest px-3">
                                        <Info className="h-3.5 w-3.5" />
                                        Variable Info
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-5 rounded-2xl border-border/40 shadow-2xl bg-white/95 backdrop-blur-md" align="end">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                            <Terminal className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-primary">Variable Documentation</h4>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="space-y-2.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1 flex items-center gap-2">
                                                <Activity className="h-3 w-3" />
                                                Alert Information
                                            </p>
                                            <div className="grid gap-2.5">
                                                {[
                                                    { v: "project", d: "Name of the project (e.g. \"Cloud Gateway\")" },
                                                    { v: "resource", d: "Resource name (e.g. \"Main Server\")" },
                                                    { v: "type", d: "Alert metric (e.g. CPU, Memory, SSL)" },
                                                    { v: "value", d: "Current recorded value (e.g. 98.4%)" },
                                                    { v: "threshold", d: "The alert limit that was exceeded" }
                                                ].map(item => (
                                                    <div key={item.v} className="flex flex-col gap-0.5">
                                                        <code className="text-[10px] font-black text-primary/80">{"{{"}{item.v}{"}}"}</code>
                                                        <span className="text-[10px] text-muted-foreground leading-tight italic">{item.d}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1 flex items-center gap-2">
                                                <Shield className="h-3 w-3" />
                                                Branding & Identity
                                            </p>
                                            <div className="grid gap-2.5">
                                                {[
                                                    { v: "company", d: "Your company name from global settings" },
                                                    { v: "logo", d: "Renders your logo as a stylised image tag" },
                                                    { v: "logo_url", d: "Raw image URL (useful for CSS backgrounds)" }
                                                ].map(item => (
                                                    <div key={item.v} className="flex flex-col gap-0.5">
                                                        <code className="text-[10px] font-black text-primary/80">{"{{"}{item.v}{"}}"}</code>
                                                        <span className="text-[10px] text-muted-foreground leading-tight italic">{item.d}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <DialogDescription className="text-muted-foreground/80 leading-relaxed">
                            {isSimpleMode ? "Select which information to include in the alert email." : "Use dynamic variables to customize your email template. All variables are listed below for your reference."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-8 pb-4">
                        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-muted/20 p-1.5 rounded-2xl mb-2">
                                <TabsTrigger value="edit" className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all border-none">Edit Template</TabsTrigger>
                                <TabsTrigger value="preview" className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all border-none">Live Preview</TabsTrigger>
                            </TabsList>

                            <TabsContent value="edit" className="space-y-6 py-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                {/* MODE TOGGLE */}
                                <div className="flex items-center justify-between px-5 py-3.5 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            Simple Checklist Mode
                                            {isSimpleMode && <Check className="h-3 w-3" />}
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground/80 font-medium">Toggle alert fields without writing HTML</p>
                                    </div>
                                    <Switch
                                        checked={isSimpleMode}
                                        onCheckedChange={setIsSimpleMode}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Subject</Label>
                                        <Input
                                            value={editSubject}
                                            onChange={(e) => setEditSubject(e.target.value)}
                                            placeholder="Alert: {{resource}} usage is High on {{project}}"
                                            className="h-11 bg-muted/20 border-border/40 rounded-xl text-sm"
                                        />
                                    </div>

                                    {isSimpleMode ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Information Checklist</Label>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-6 rounded-2xl border border-border/40">
                                                {[
                                                    { id: "showLogo", label: "Show Branding Logo", key: "showLogo", icon: <Layout className="h-3.5 w-3.5" /> },
                                                    { id: "showProject", label: "Project Name", key: "showProject", icon: <Server className="h-3.5 w-3.5" /> },
                                                    { id: "showResource", label: "Resource Name", key: "showResource", icon: <Globe className="h-3.5 w-3.5" /> },
                                                    { id: "showMetric", label: "Metric Type (CPU/Memory)", key: "showMetric", icon: <Activity className="h-3.5 w-3.5" /> },
                                                    { id: "showValue", label: "Current Value", key: "showValue", icon: <Terminal className="h-3.5 w-3.5" /> },
                                                    { id: "showThreshold", label: "Threshold Value", key: "showThreshold", icon: <Shield className="h-3.5 w-3.5" /> },
                                                    { id: "showCompany", label: "Show Company Footer", key: "showCompany", icon: <Info className="h-3.5 w-3.5" /> },
                                                ].map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center space-x-3 group cursor-pointer p-2 rounded-xl hover:bg-background/50 transition-all border border-transparent hover:border-primary/10"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setSimpleConfig(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof simpleConfig] }));
                                                        }}
                                                    >
                                                        <Checkbox
                                                            id={item.id}
                                                            checked={simpleConfig[item.key as keyof typeof simpleConfig]}
                                                            onCheckedChange={(v) => {
                                                                setSimpleConfig(prev => ({ ...prev, [item.key]: !!v }));
                                                            }}
                                                            className="h-5 w-5 rounded-lg border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-background shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
                                                                {item.icon}
                                                            </div>
                                                            <Label htmlFor={item.id} className="text-xs font-black text-foreground/70 group-hover:text-primary transition-colors cursor-pointer tracking-tight uppercase">
                                                                {item.label}
                                                            </Label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between ml-1">
                                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Variable Reference</Label>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/5 rounded-2xl border border-border/40">
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-1">Alert Info</p>
                                                        {[
                                                            { v: "project", d: "Project Name" },
                                                            { v: "resource", d: "Resource Name" },
                                                            { v: "type", d: "Metric Type" },
                                                            { v: "value", d: "Current Value" },
                                                            { v: "threshold", d: "Threshold" },
                                                        ].map(v => (
                                                            <div key={v.v} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-primary/5 group transition-all">
                                                                <code className="text-[10px] font-black text-primary/80">{"{{"}{v.v}{"}}"}</code>
                                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{v.d}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="space-y-2 border-l border-border/40 pl-4">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-1">Branding</p>
                                                        {[
                                                            { v: "company", d: "Company Name" },
                                                            { v: "company_name", d: "Company Name (Alias)" },
                                                            { v: "logo", d: "Full Logo Image" },
                                                            { v: "logo_url", d: "Raw Logo URL" },
                                                        ].map(v => (
                                                            <div key={v.v} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-primary/5 group transition-all">
                                                                <code className="text-[10px] font-black text-primary/80">{"{{"}{v.v}{"}}"}</code>
                                                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{v.d}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Body (HTML supported)</Label>
                                                <textarea
                                                    value={editBody}
                                                    onChange={(e) => setEditBody(e.target.value)}
                                                    className="w-full min-h-[300px] p-4 bg-muted/20 border border-border/40 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                    placeholder="Enter custom HTML here..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="preview" className="animate-in fade-in slide-in-from-right-2 duration-300 outline-none">
                                <div className="rounded-2xl border border-border/40 overflow-hidden bg-white shadow-xl shadow-black/5">
                                    <div className="bg-slate-50 px-6 py-3 border-b border-border/40 text-[11px] font-mono text-muted-foreground flex items-center gap-3">
                                        <span className="shrink-0 font-black uppercase text-foreground/40 text-[9px] tracking-tighter">Subject:</span>
                                        <span className="truncate">
                                            {replaceVariables(editSubject)}
                                        </span>
                                    </div>
                                    <div
                                        className="p-8 overflow-auto max-h-[500px] bg-[#f8fafc] scrollbar-thin scrollbar-thumb-muted-foreground/20"
                                        dangerouslySetInnerHTML={{
                                            __html: replaceVariables(editBody || `
                                                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background: white;">
                                                    <div style="text-align: center; margin-bottom: 20px;">
                                                        <h2 style="color: #333;">InfraWatch</h2>
                                                    </div>
                                                    <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                                                        <strong>Critical Alert!</strong> High usage detected.
                                                    </div>
                                                    <table style="width: 100%; border-collapse: collapse;">
                                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">Demo Project</td></tr>
                                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Resource:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">Demo Server</td></tr>
                                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Metric:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">CPU Usage</td></tr>
                                                    </table>
                                                </div>
                                            `, true)
                                        }}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter className="px-8 pb-8 pt-0 bg-background/50 backdrop-blur-sm border-t border-border/20 mt-4">
                        <Button variant="ghost" onClick={() => setEditingType(null)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button onClick={handleSave} className="rounded-xl px-8 bg-primary shadow-lg shadow-primary/20 font-bold uppercase tracking-widest text-[10px]">
                            {updateTemplate.isPending ? "Saving..." : "Save Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
