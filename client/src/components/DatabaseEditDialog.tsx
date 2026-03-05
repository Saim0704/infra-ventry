import { useProjects } from "@/hooks/use-projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const editDatabaseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    host: z.string().min(1, "Host is required"),
    port: z.coerce.number().min(1, "Port is required"),
    engine: z.string().min(1, "Engine is required"),
    version: z.string().optional(),
    projectId: z.coerce.number().nullable().optional(),
});

type EditDatabaseFormValues = z.infer<typeof editDatabaseSchema>;

interface DatabaseEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    db: any | null;
}

export function DatabaseEditDialog({ open, onOpenChange, db }: DatabaseEditDialogProps) {
    const { data: projects } = useProjects();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<EditDatabaseFormValues>({
        resolver: zodResolver(editDatabaseSchema),
        defaultValues: {
            name: db?.name || "",
            host: db?.host || "",
            port: db?.port || 5432,
            engine: db?.engine || "PostgreSQL",
            version: db?.version || "",
            projectId: db?.projectId || null,
        },
    });

    // Reset form when db changes
    if (db && form.getValues("name") !== db.name && !form.formState.isDirty) {
        form.reset({
            name: db.name || "",
            host: db.host || "",
            port: db.port || 5432,
            engine: db.engine || "PostgreSQL",
            version: db.version || "",
            projectId: db.projectId || null,
        });
    }

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
            queryClient.invalidateQueries({ queryKey: [api.projects.resources.path.replace(":id", String(db.projectId))] });
            toast({ title: "Database updated", description: "Configuration has been saved successfully." });
            onOpenChange(false);
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update database", variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Database</DialogTitle>
                    <DialogDescription>
                        Update database details. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
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
                            defaultValue={db?.projectId ? String(db.projectId) : "none"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Uncategorized</SelectItem>
                                {projects?.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
