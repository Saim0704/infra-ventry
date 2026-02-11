import { useDatabases, useDatabase } from "@/hooks/use-databases";
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
import { Database, HardDrive, Network, Search, Plus, Layout, ChevronRight, ChevronDown, Eye, Trash2, Edit2, AlertTriangle } from "lucide-react";
import { useState, Fragment } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

// Schema for editing database
const editDatabaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1, "Port is required"),
  engine: z.string().min(1, "Engine is required"),
  version: z.string().optional(),
  projectId: z.coerce.number().nullable().optional(),
});

type EditDatabaseFormValues = z.infer<typeof editDatabaseSchema>;

export default function DatabasesPage() {
  const { data: databases, isLoading } = useDatabases();
  const { data: projects } = useProjects();
  const [selectedDbId, setSelectedDbId] = useState<number | null>(null);
  const [editingDb, setEditingDb] = useState<any | null>(null);
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [deletingDbId, setDeletingDbId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleProject = (name: string) => {
    setCollapsedProjects(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.databases.delete.path.replace(":id", String(id)), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete database");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.databases.list.path] });
      toast({ title: "Database deleted", description: "The database has been removed from inventory." });
      setDeletingDbId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete database", variant: "destructive" });
    },
  });

  const filteredDatabases = databases?.filter(db =>
    (db.name && db.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (db.host && db.host.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedDatabases = filteredDatabases?.reduce((acc, db) => {
    const projectName = db.project?.name || "Uncategorized";
    if (!acc[projectName]) acc[projectName] = [];
    acc[projectName].push(db);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Shell title="Databases" description="Monitor database instances, storage, and active connections.">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            Database Inventory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Manage your database clusters and monitoring agents.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search databases..."
              className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="h-11 px-6 bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 rounded-xl font-bold tracking-tight"
            onClick={() => setIsCreatingDb(true)}
          >
            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Database
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
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
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredDatabases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-medium">
                  {searchTerm ? "No databases match your search criteria." : "No databases connected. Use 'Generate Key' to connect an agent."}
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedDatabases || {}).map(([projectName, projectDbs]) => {
                const isCollapsed = collapsedProjects[projectName];
                return (
                  <Fragment key={projectName}>
                    <TableRow className="bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => toggleProject(projectName)}>
                      <TableCell colSpan={7} className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <Layout className="h-4 w-4 text-primary/60" />
                          <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                            {projectDbs.length} {projectDbs.length === 1 ? 'Database' : 'Databases'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed && projectDbs.map((db) => {
                      const lastMetric = db.metrics?.[0];
                      return (
                        <TableRow key={db.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                          <TableCell className="pl-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-300">
                                <Database className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight">{db.name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold">{db.engine || "Unknown"}</span>
                              <span className="text-[10px] text-muted-foreground font-medium pl-0">{db.version || "Latest"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 font-mono text-[10px]">
                            <code className="bg-secondary/50 px-2 py-1 rounded-md border border-border/50 text-foreground/80 shadow-inner">
                              {db.host}:{db.port}
                            </code>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{lastMetric?.storageUsed?.toFixed(2) ?? "0.00"} GB</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Network className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{lastMetric?.activeConnections ?? 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground/80">
                                {db.lastSeen ? formatDistanceToNow(new Date(db.lastSeen), { addSuffix: true }) : "Never"}
                              </span>
                              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Heartbeat</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex justify-end gap-1 transition-all duration-300">
                              <Dialog onOpenChange={(open) => setSelectedDbId(open ? db.id : null)}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-display flex items-center gap-2">
                                      <Database className="h-6 w-6 text-accent" />
                                      {db.name} Details
                                    </DialogTitle>
                                  </DialogHeader>
                                  <DatabaseDetailView id={selectedDbId} />
                                </DialogContent>
                              </Dialog>

                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors" onClick={() => setEditingDb(db)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>

                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors" onClick={() => setDeletingDbId(db.id)}>
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

      <Dialog open={!!editingDb} onOpenChange={(open) => !open && setEditingDb(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Database</DialogTitle>
            <DialogDescription>
              Update database details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingDb && <EditDatabaseForm db={editingDb} projects={projects || []} onClose={() => setEditingDb(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingDb} onOpenChange={setIsCreatingDb}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Database</DialogTitle>
            <DialogDescription>
              Add a new database to the inventory.
            </DialogDescription>
          </DialogHeader>
          <CreateDatabaseForm projects={projects || []} onClose={() => setIsCreatingDb(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDbId} onOpenChange={(open) => !open && setDeletingDbId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Database
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this database? This action cannot be undone and will remove all collected metrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingDbId && deleteMutation.mutate(deletingDbId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function EditDatabaseForm({ db, projects, onClose }: { db: any, projects: any[], onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditDatabaseFormValues>({
    resolver: zodResolver(editDatabaseSchema),
    defaultValues: {
      name: db.name || "",
      host: db.host || "",
      port: db.port || 5432,
      engine: db.engine || "PostgreSQL",
      version: db.version || "",
      projectId: db.projectId || null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditDatabaseFormValues) => {
      const res = await fetch(api.databases.update.path.replace(":id", String(db.id)), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update database");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.databases.list.path] });
      toast({ title: "Database updated", description: "Configuration has been saved successfully." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update database", variant: "destructive" });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
        {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="host">Host</Label>
          <Input id="host" {...form.register("host")} />
          {form.formState.errors.host && <span className="text-xs text-destructive">{form.formState.errors.host.message}</span>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="port">Port</Label>
          <Input id="port" type="number" {...form.register("port", { valueAsNumber: true })} />
          {form.formState.errors.port && <span className="text-xs text-destructive">{form.formState.errors.port.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="engine">Engine</Label>
          <Input id="engine" {...form.register("engine")} />
          {form.formState.errors.engine && <span className="text-xs text-destructive">{form.formState.errors.engine.message}</span>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="version">Version</Label>
          <Input id="version" {...form.register("version")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project">Project</Label>
        <Select
          onValueChange={(val) => form.setValue("projectId", val === "none" ? null : Number(val))}
          defaultValue={db.projectId ? String(db.projectId) : "none"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Uncategorized</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
      </DialogFooter>
    </form>
  );
}

function CreateDatabaseForm({ projects, onClose }: { projects: any[], onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditDatabaseFormValues>({
    resolver: zodResolver(editDatabaseSchema),
    defaultValues: {
      name: "",
      host: "",
      port: 5432,
      engine: "PostgreSQL",
      version: "",
      projectId: null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditDatabaseFormValues) => {
      const res = await fetch(api.databases.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create database");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.databases.list.path] });
      toast({ title: "Database created", description: "New database has been added to inventory." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create database", variant: "destructive" });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="e.g. Primary DB" {...form.register("name")} />
        {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="host">Host</Label>
          <Input id="host" placeholder="e.g. localhost" {...form.register("host")} />
          {form.formState.errors.host && <span className="text-xs text-destructive">{form.formState.errors.host.message}</span>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="port">Port</Label>
          <Input id="port" type="number" {...form.register("port", { valueAsNumber: true })} />
          {form.formState.errors.port && <span className="text-xs text-destructive">{form.formState.errors.port.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="engine">Engine</Label>
          <Input id="engine" placeholder="e.g. PostgreSQL" {...form.register("engine")} />
          {form.formState.errors.engine && <span className="text-xs text-destructive">{form.formState.errors.engine.message}</span>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="version">Version</Label>
          <Input id="version" placeholder="e.g. 15.0" {...form.register("version")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project">Project</Label>
        <Select
          onValueChange={(val) => form.setValue("projectId", val === "none" ? null : Number(val))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Uncategorized</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Database"}</Button>
      </DialogFooter>
    </form>
  );
}

function DatabaseDetailView({ id }: { id: number | null }) {
  const { data: db, isLoading } = useDatabase(id);

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
  if (!db) return null;

  const chartData = db.metrics.slice(-20).map(m => ({
    time: format(new Date(m.createdAt || new Date()), "HH:mm"),
    connections: m.activeConnections,
    storage: m.storageUsed
  }));

  return (
    <div className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <div className="text-3xl font-bold font-display">{db.metrics[0]?.storageUsed?.toFixed(2) ?? 0} GB</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Network className="h-4 w-4" />
              <span className="text-sm font-medium">Active Connections</span>
            </div>
            <div className="text-3xl font-bold font-display">{db.metrics[0]?.activeConnections ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Connection History</h3>
        <div className="h-[300px] w-full bg-card border border-border rounded-xl p-4 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                cursor={{ fill: 'hsl(var(--secondary))' }}
              />
              <Bar dataKey="connections" name="Connections" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
