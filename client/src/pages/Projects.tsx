import { Link } from "wouter";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from "@/hooks/use-projects";
import { useServers } from "@/hooks/use-servers";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Plus, Trash2, Folder, Server, Edit2, Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ProjectsPage() {
    const { data: projects, isLoading: projectsLoading } = useProjects();
    const { data: servers, isLoading: serversLoading } = useServers();
    const createProject = useCreateProject();
    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [searchTerm, setSearchTerm] = useState("");

    const isLoading = projectsLoading || serversLoading;

    const filteredProjects = projects?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getServersInProject = (projectId: number) => {
        return servers?.filter(s => s.projectId === projectId) || [];
    };

    const onSubmit = async () => {
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
            setIsFormOpen(false);
            setEditingProject(null);
            setNewProject({ name: "", description: "" });
        } catch (err) {
            toast({ title: `Failed to ${editingProject ? 'update' : 'create'} project`, variant: "destructive" });
        }
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setNewProject({ name: project.name, description: project.description || "" });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this project? Servers will be unassigned but not deleted.")) {
            try {
                await deleteProject.mutateAsync(id);
                toast({ title: "Project deleted" });
                queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
                queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
            } catch (err) {
                toast({ title: "Delete failed", variant: "destructive" });
            }
        }
    };

    return (
        <Shell>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
                <div>
                    <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                        Project Inventory
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Orchestrate and group your resource landscape by organization.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search projects..."
                            className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => { setEditingProject(null); setNewProject({ name: "", description: "" }); setIsFormOpen(true); }} className="h-11 px-6 bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 rounded-xl font-bold tracking-tight">
                        <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Project
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl shadow-foreground/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40 border-b border-border/40">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 pl-8">Project Name</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Description</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Servers</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Created At</TableHead>
                            <TableHead className="py-6 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-8 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-64" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredProjects?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                                    {searchTerm ? "No projects match your search criteria." : "No projects created yet. Start by adding one!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProjects?.map((project) => {
                                const projectServers = getServersInProject(project.id);
                                return (
                                    <TableRow key={project.id} className="group hover:bg-muted/20 border-b border-border/40 transition-colors">
                                        <TableCell className="pl-8 py-4">
                                            <Link href={`/projects/${project.id}`}>
                                                <div className="flex items-center gap-3 cursor-pointer group/name">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/name:bg-primary group-hover/name:text-white transition-all duration-300">
                                                        <Folder className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-sm tracking-tight group-hover/name:text-primary transition-colors">{project.name}</span>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="py-4 text-sm text-muted-foreground">
                                            <span className="line-clamp-1">{project.description || "—"}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                    <Server className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm font-bold">{projectServers.length}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                                            {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "N/A"}
                                        </TableCell>
                                        <TableCell className="py-4 text-right pr-8">
                                            <div className="flex justify-end gap-1 transition-all duration-300">
                                                <Link href={`/projects/${project.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent/20 hover:text-accent transition-colors" onClick={() => handleEdit(project)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors" onClick={() => handleDelete(project.id)}>
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
                                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description (Optional)</Label>
                            <Input
                                placeholder="Brief purpose of this project"
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsFormOpen(false);
                                setNewProject({ name: "", description: "" });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={createProject.isPending || updateProject.isPending || !newProject.name}
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
