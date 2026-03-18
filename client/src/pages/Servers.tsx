import { useServers, useServer, useCreateServer, useUpdateServer, useDeleteServer, useUpdateServerOrder } from "@/hooks/use-servers";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/ui/UsageBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serverWithMetricsSchema } from "@shared/schema";
import { useState, Fragment } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, formatDistanceToNow } from "date-fns";
import { Server, Cpu, HardDrive, CircuitBoard, Plus, Edit2, Trash2, Eye, Terminal, Layout, Activity, Shield, Globe, User, Key, Search, ChevronDown, ChevronRight, Folder, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog";
import { ServerDetailView } from "@/components/ServerDetailView";
import { ServerEditDialog } from "@/components/ServerEditDialog";
import { RegistrationModal } from "@/components/RegistrationModal";
import { useTokens, useCreateToken } from "@/hooks/use-tokens";
import { z } from "zod";

type ServerWithMetrics = z.infer<typeof serverWithMetricsSchema>;

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const { data: tokens } = useTokens();
  const createToken = useCreateToken();
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [activeRegToken, setActiveRegToken] = useState<string | null>(null);
  const [activeRegProject, setActiveRegProject] = useState("Default Project");

  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const toggleProject = (name: string) => {
    setExpandedProjects(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const form = useForm<ServerWithMetrics>({
    resolver: zodResolver(serverWithMetricsSchema),
    defaultValues: {
      hostname: "",
      name: "",
      ipAddress: "",
      os: "",
      osVersion: "",
      cpuCores: 1,
      totalRam: 1,
      sshUser: "root",
      sshKey: "",
      projectId: null,
      totalDisk: 10,
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

  const filteredServers = servers?.filter(server =>
    (server.name && server.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (server.ipAddress && server.ipAddress.includes(searchTerm))
  );

  const groupedServers = filteredServers?.reduce((acc, server) => {
    const project = (server as any).project;
    const projectKey = project ? `project-${project.id}` : "uncategorized";
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: project || { name: "Uncategorized" },
        items: []
      };
    }
    acc[projectKey].items.push(server);
    return acc;
  }, {} as Record<string, { project: any, items: any[] }>);

  const onSubmit = async (data: ServerWithMetrics) => {
    try {
      const payload = {
        ...data,
        memoryUsage: calculatedMemoryUsage,
        diskUsage: calculatedDiskUsage
      };
      if (editingServer) {
        await updateServer.mutateAsync({ id: editingServer.id, data: payload });
        toast({ title: "Server updated successully" });
      } else {
        await createServer.mutateAsync(payload);
        toast({ title: "Server created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
      setIsFormOpen(false);
      setEditingServer(null);
      form.reset();
    } catch (err) {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const handleEdit = (server: any) => {
    setEditingServer(server);
  };

  const updateServerOrder = useUpdateServerOrder();

  const handleMoveServer = async (server: any, groupItems: any[], direction: 'up' | 'down') => {
    const index = groupItems.findIndex(s => s.id === server.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= groupItems.length) return;

    const targetServer = groupItems[targetIndex];
    
    let newCurrentOrder = targetServer.sortOrder;
    let newTargetOrder = server.sortOrder;

    if (newCurrentOrder === newTargetOrder) {
      newCurrentOrder = targetIndex;
      newTargetOrder = index;
    }

    try {
      await Promise.all([
        updateServerOrder.mutateAsync({ id: server.id, order: newCurrentOrder }),
        updateServerOrder.mutateAsync({ id: targetServer.id, order: newTargetOrder })
      ]);
      queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
    } catch (err) {
      toast({ title: "Failed to move server", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this server?")) {
      try {
        await deleteServer.mutateAsync(id);
        toast({ title: "Server deleted" });
        queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
      } catch (err) {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    }
  };

  const handleAgentSetup = async () => {
    // Find a token to use
    if (tokens && tokens.length > 0) {
      setActiveRegToken(tokens[0].token);
      setActiveRegProject(projects?.find(p => p.id === tokens[0].projectId)?.name || "Uncategorized");
      setIsRegistrationOpen(true);
    } else if (projects && projects.length > 0) {
      // Create a token for the first project if none exists
      try {
        const newToken = await createToken.mutateAsync({
          name: "Default Server Token",
          type: "vm",
          projectId: projects[0].id,
          token: "auto-gen"
        });
        setActiveRegToken(newToken.token);
        setActiveRegProject(projects[0].name);
        setIsRegistrationOpen(true);
      } catch (err) {
        toast({ title: "Failed to initialize agent token", variant: "destructive" });
      }
    } else {
      toast({ title: "Please create a project first", description: "Agents must be associated with a project." });
      setIsProjectFormOpen(true);
    }
  };

  return (
    <Shell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            Server Inventory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Orchestrate and monitor your server landscape in real-time.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP or Name..."
              className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsProjectFormOpen(true)} variant="outline" className="h-11 px-6 border-primary/20 hover:bg-primary/5 transition-all duration-300 rounded-xl font-bold tracking-tight text-primary">
            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Project
          </Button>
          <Button onClick={() => {
            setEditingServer(null); form.reset({
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
            }); setIsFormOpen(true);
          }} className="h-11 px-6 bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 rounded-xl font-bold tracking-tight">
            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Server
          </Button>
          <Button onClick={handleAgentSetup} variant="secondary" className="h-11 px-6 bg-accent/10 border-accent/20 hover:bg-accent/20 transition-all duration-300 rounded-xl font-bold tracking-tight text-accent">
            <Terminal className="mr-2 h-4 w-4 stroke-[3px]" /> Agent Setup
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border/40">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8 w-[80px]">#</TableHead>
              <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Identifier</TableHead>
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-8"><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell colSpan={3} className="px-4"><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : Object.keys(groupedServers || {}).length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground font-medium">
                  {searchTerm ? "No servers match your search criteria." : "No servers mapped yet. Ready to expand?"}
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedServers || {})
                .sort(([, a], [, b]) => {
                  const orderA = a.project?.sortOrder ?? 0;
                  const orderB = b.project?.sortOrder ?? 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return (a.project?.name || "").localeCompare(b.project?.name || "");
                })
                .map(([projectKey, group]) => {
                const { project, items: projectServers } = group;
                const projectName = project.name;
                const isExpanded = expandedProjects[projectKey];
                return (
                  <Fragment key={projectKey}>
                    <TableRow className="bg-muted/10 hover:bg-muted/20 group/header transition-colors">
                      <TableCell colSpan={9} className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleProject(projectKey)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <Layout className="h-4 w-4 text-primary/60" />
                            <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                              {projectServers.length} {projectServers.length === 1 ? 'Server' : 'Servers'}
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
                                        queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
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
                    {isExpanded && projectServers.map((server, serverIndex) => {
                      const lastMetric = server.metrics?.[0];
                      return (
                        <TableRow key={server.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                          <TableCell className="pl-8 py-4 font-bold text-muted-foreground/60 w-[80px]">
                            <div className="flex items-center gap-3">
                              <span className="w-4 text-xs font-mono">{serverIndex + 1}</span>
                              {!searchTerm && (
                                <div className="flex flex-col -gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 rounded hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30" 
                                    onClick={() => handleMoveServer(server, projectServers, 'up')}
                                    disabled={serverIndex === 0}
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 rounded hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30" 
                                    onClick={() => handleMoveServer(server, projectServers, 'down')}
                                    disabled={serverIndex === projectServers.length - 1}
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3 cursor-pointer group/name" onClick={() => { setSelectedServerId(server.id); setIsDetailOpen(true); }}>
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
                          </TableCell>
                          <TableCell className="py-4 font-mono text-[10px]">
                            <code className="bg-secondary/50 px-2 py-1 rounded-md border border-border/50 text-foreground/80 shadow-inner">
                              {server.ipAddress || "0.0.0.0"}
                            </code>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all duration-300">
                                {server.os?.toLowerCase().includes("win") ? <Layout className="h-3 w-3 text-blue-500" /> : <Terminal className="h-3 w-3 text-primary" />}
                                <span className="text-xs font-semibold">{server.os || "Linux"}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium pl-4.5">{server.osVersion || "Unknown"}</span>
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
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground/80">
                                {server.lastSeen ? formatDistanceToNow(new Date(server.lastSeen), { addSuffix: true }) : "Never"}
                              </span>
                              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Heartbeat</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex justify-end gap-1 transition-all duration-300">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" onClick={() => { setSelectedServerId(server.id); setIsDetailOpen(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors" onClick={() => handleEdit(server)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors" onClick={() => handleDelete(server.id)}>
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

      {/* Detail Dialog */}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              Detail View
            </DialogTitle>
          </DialogHeader>
          {selectedServerId && <ServerDetailView id={selectedServerId} />}
        </DialogContent>
      </Dialog>

      <ServerEditDialog
        open={!!editingServer}
        onOpenChange={(open) => {
          if (!open) {
            setEditingServer(null);
            setIsFormOpen(false);
          }
        }}
        server={editingServer}
      />

      {/* Add Dialog - for new servers we can still use the local form or create a ServerCreateDialog. 
          For now I'll just use the old form for Add if it's not editing. */}
      <Dialog open={isFormOpen && !editingServer} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[650px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editingServer ? "Edit Server" : "Add New Server"}</DialogTitle>
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
                      <FormControl><Input {...field} placeholder="web-srv-01" disabled={!!editingServer} /></FormControl>
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
                        <FormLabel>Storage Used (GB)</FormLabel>
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

              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                  {editingServer ? "Save Changes" : "Create Server"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Project Creation Dialog */}
      <Dialog open={isProjectFormOpen} onOpenChange={(open) => { setIsProjectFormOpen(open); if (!open) setEditingProject(null); }}>
        <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>Group your servers by organization or department.</DialogDescription>
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
                  } else {
                    await createProject.mutateAsync(newProject);
                    toast({ title: "Project created successfully" });
                  }
                  queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
                  queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
                  setIsProjectFormOpen(false);
                  setEditingProject(null);
                  setNewProject({ name: "", description: "" });
                } catch (err) {
                  toast({ title: "Action failed", variant: "destructive" });
                }
              }}
              disabled={createProject.isPending || updateProject.isPending || !newProject.name}
              className="font-bold relative overflow-hidden group"
            >
              <span className="relative z-10">{editingProject ? "Save Changes" : "Create Project"}</span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RegistrationModal
        open={isRegistrationOpen}
        onOpenChange={setIsRegistrationOpen}
        token={activeRegToken}
        projectName={activeRegProject}
      />
    </Shell>
  );
}

