import { useClusters, useCluster, useDeleteCluster } from "@/hooks/use-clusters";
import { useProjects, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ClusterDetailView } from "@/components/ClusterDetailView";
import { ClusterEditDialog } from "@/components/ClusterEditDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, Fragment } from "react";
import { Cloud, Search, Layout, ChevronRight, ChevronDown, Eye, Edit2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { UsageBar } from "@/components/ui/UsageBar";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters();
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCluster, setEditingCluster] = useState<any | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const deleteCluster = useDeleteCluster();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleProject = (name: string) => {
    setExpandedProjects(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredClusters = clusters?.filter(cluster =>
    cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cluster.version && cluster.version.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedClusters = filteredClusters?.reduce((acc, cluster) => {
    const project = (cluster as any).project;
    const projectKey = project ? `project-${project.id}` : "uncategorized";
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: project || { name: "Uncategorized" },
        items: []
      };
    }
    acc[projectKey].items.push(cluster);
    return acc;
  }, {} as Record<string, { project: any, items: any[] }>);

  return (
    <Shell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            Cluster Inventory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Orchestrate and monitor your Kubernetes clusters and node pools.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clusters..."
              className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
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
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : Object.keys(groupedClusters || {}).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground font-medium">
                  {searchTerm ? "No clusters match your search criteria." : "No clusters monitored yet."}
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedClusters || {}).map(([projectKey, group]) => {
                const { project, items: projectClusters } = group;
                const projectName = project.name;
                const isExpanded = expandedProjects[projectKey];
                return (
                  <Fragment key={projectKey}>
                    <TableRow className="bg-muted/10 hover:bg-muted/20 group/header transition-colors">
                      <TableCell colSpan={8} className="py-3 px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleProject(projectKey)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <Layout className="h-4 w-4 text-primary/60" />
                            <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                              {projectClusters.length} {projectClusters.length === 1 ? 'Cluster' : 'Clusters'}
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
                                        queryClient.invalidateQueries({ queryKey: [api.clusters.list.path] });
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
                    {isExpanded && projectClusters.map((cluster) => {
                      const lastMetric = cluster.metrics?.[0];
                      return (
                        <TableRow key={cluster.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                          <TableCell className="pl-8 py-4">
                            <div className="flex items-center gap-3 cursor-pointer group/name" onClick={() => { setSelectedClusterId(cluster.id); setIsDetailOpen(true); }}>
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/name:scale-110 transition-transform duration-300">
                                <Cloud className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-sm tracking-tight group-hover/name:text-blue-500 transition-colors">{cluster.name}</span>
                            </div>
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
                            <div className="flex justify-end gap-1 transition-all duration-300">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" onClick={() => { setSelectedClusterId(cluster.id); setIsDetailOpen(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
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
                    })}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
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
                  queryClient.invalidateQueries({ queryKey: [api.clusters.list.path] });
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
      <ClusterEditDialog
        open={!!editingCluster}
        onOpenChange={(open) => !open && setEditingCluster(null)}
        cluster={editingCluster}
      />

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/50 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2 italic font-black uppercase">
              <Cloud className="h-6 w-6 text-blue-500" />
              Cluster Details
            </DialogTitle>
          </DialogHeader>
          {selectedClusterId && <ClusterDetailView id={selectedClusterId} />}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
