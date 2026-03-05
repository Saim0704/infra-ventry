import { useDomainMonitors, useDeleteDomainMonitor, useCreateDomainMonitor } from "@/hooks/use-domain-monitors";
import { useProjects, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Shell } from "@/components/layout/Shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe, Clock, Shield, Search, Plus, Trash2, Edit2, ChevronRight, ChevronDown, Folder, AlertTriangle } from "lucide-react";
import { useState, Fragment } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function DomainMonitoringPage() {
    const { data: monitors, isLoading } = useDomainMonitors();
    const { data: projects } = useProjects();
    const [isCreatingMonitor, setIsCreatingMonitor] = useState(false);
    const [deletingMonitorId, setDeletingMonitorId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const deleteDomainMonitor = useDeleteDomainMonitor();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const toggleProject = (name: string) => {
        setExpandedProjects(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const filteredMonitors = monitors?.filter(m =>
        (m.domain && m.domain.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupedMonitors = filteredMonitors?.reduce((acc, m: any) => {
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

    return (
        <Shell>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
                <div>
                    <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-indigo-400 to-indigo-600 bg-clip-text text-transparent italic">
                        Domain Monitors
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Expiration tracking for your domain names.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search domains..."
                            className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-indigo-500/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 rounded-xl font-bold tracking-tight text-white"
                        onClick={() => setIsCreatingMonitor(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Domain
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40 border-b border-border/40">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Domain</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Status</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Days Left</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Expiry Date</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Last Check</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-8 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : Object.keys(groupedMonitors || {}).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                                    {searchTerm ? "No domains match your search criteria." : "No domain monitors active. Add a domain to start tracking expiration."}
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
                                            <TableCell colSpan={6} className="py-3 px-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleProject(projectKey)}>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                        <Globe className="h-4 w-4 text-indigo-500/60" />
                                                        <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{projectName}</span>
                                                        <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full ml-2">
                                                            {projectMonitors.length} {projectMonitors.length === 1 ? 'Domain' : 'Domains'}
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
                                                                                queryClient.invalidateQueries({ queryKey: [api.domainMonitors.list.path] });
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
                                        {isExpanded && projectMonitors.map((m: any) => {
                                            const now = new Date();
                                            const expiry = m.expiryDate ? new Date(m.expiryDate) : null;
                                            const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                                            return (
                                                <TableRow key={m.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                                    <TableCell className="pl-8 py-4">
                                                        <div className="flex items-center gap-3 group/name">
                                                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover/name:scale-110 transition-transform duration-300">
                                                                <Globe className="h-4 w-4" />
                                                            </div>
                                                            <span className="font-bold text-sm tracking-tight group-hover/name:text-indigo-500 transition-colors">{m.domain}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                            m.status === 'active' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                                                                m.status === 'error' ? "text-destructive bg-destructive/10 border-destructive/20" :
                                                                    "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                                        )}>
                                                            {m.status || 'pending'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 font-bold text-sm">
                                                        {daysLeft !== null ? (
                                                            <span className={cn(daysLeft <= 30 ? "text-destructive" : daysLeft <= 60 ? "text-amber-500" : "text-emerald-500")}>
                                                                {daysLeft} days
                                                            </span>
                                                        ) : "Checking..."}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                                                        {expiry ? format(expiry, "MMM dd, yyyy") : "Pending"}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                                                        {m.lastCheck ? formatDistanceToNow(new Date(m.lastCheck), { addSuffix: true }) : "Never"}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right pr-6">
                                                        <div className="flex justify-end gap-1">
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

            <Dialog open={isCreatingMonitor} onOpenChange={setIsCreatingMonitor}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-border/50 shadow-2xl bg-background/95 backdrop-blur-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display italic font-black text-indigo-500">Add Domain</DialogTitle>
                        <DialogDescription>Setup tracking for a new domain name expiration.</DialogDescription>
                    </DialogHeader>
                    <DomainMonitorForm projects={projects || []} onClose={() => setIsCreatingMonitor(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingMonitorId} onOpenChange={(open) => !open && setDeletingMonitorId(null)}>
                <AlertDialogContent className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" /> Delete Domain Monitor
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Stop tracking this domain name? This will permanently delete the domain history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => deletingMonitorId && deleteDomainMonitor.mutate(deletingMonitorId, {
                            onSuccess: () => setDeletingMonitorId(null)
                        })}>
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
                                    queryClient.invalidateQueries({ queryKey: [api.domainMonitors.list.path] });
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

function DomainMonitorForm({ projects, onClose }: { projects: any[], onClose: () => void }) {
    const { toast } = useToast();
    const createDomainMonitor = useCreateDomainMonitor();
    const [domain, setDomain] = useState("");
    const [projectId, setProjectId] = useState<string>("none");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!domain) {
            toast({ title: "Please enter a domain name", variant: "destructive" });
            return;
        }

        let formattedDomain = domain.trim().toLowerCase();

        if (formattedDomain.startsWith('http://')) {
            formattedDomain = formattedDomain.substring(7);
        } else if (formattedDomain.startsWith('https://')) {
            formattedDomain = formattedDomain.substring(8);
        }

        formattedDomain = formattedDomain.split('/')[0];

        try {
            await createDomainMonitor.mutateAsync({
                projectId: projectId === "none" ? null : Number(projectId),
                domain: formattedDomain
            });

            toast({ title: "Domain monitor added successfully" });
            setDomain("");
            setProjectId("none");
            onClose();
        } catch (error) {
            toast({ title: "Failed to add domain monitor", variant: "destructive" });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="grid gap-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                    id="domain"
                    placeholder="e.g. example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="rounded-xl h-11"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="project">Assign to Project (Optional)</Label>
                <Select
                    onValueChange={(val) => setProjectId(val)}
                    value={projectId}
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
                <Button type="submit" disabled={createDomainMonitor.isPending || !domain} className="rounded-xl h-11 px-8 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                    {createDomainMonitor.isPending ? "Adding..." : "Add Domain"}
                </Button>
            </DialogFooter>
        </form>
    );
}
