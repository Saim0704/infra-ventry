import { useProjectResources } from "@/hooks/use-projects";
import { useCreateToken } from "@/hooks/use-tokens";
import { useProjectAlertSettings, useUpdateProjectAlertSettings } from "@/hooks/use-project-settings";
import { useLocation, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Server, Database, Cloud, Terminal, Plus, Activity, Layout, ChevronLeft, Globe, Shield, Key, Bell, Mail, Save, Trash2, Send, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/ui/UsageBar";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { RegistrationModal } from "@/components/RegistrationModal";
import { useForm, useFieldArray } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
    const { id } = useParams();
    const [, setLocation] = useLocation();
    const { data: resources, isLoading } = useProjectResources(Number(id));
    const createToken = useCreateToken();
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
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
                <Button onClick={() => setLocation("/projects")}>Back to Projects</Button>
            </Shell>
        );
    }

    const { project, servers, databases, clusters, webMonitors } = resources;

    return (
        <Shell title={project.name} description={project.description || "Project Resource Overview"}>
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
                        <Button
                            variant="outline"
                            onClick={() => window.open(`/status/${(project as any).slug}`, '_blank')}
                            className="rounded-xl border-emerald-500/20 text-emerald-500 font-bold hover:bg-emerald-500/10"
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> View Status Page
                        </Button>
                        <Button variant="outline" onClick={() => setModalOpen(true)} className="rounded-xl border-primary/20 text-primary font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Register Resource
                        </Button>
                    </div>
                </div>
            </div>

            <RegistrationModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                token={resources?.tokens?.[0]?.token || null}
                projectName={project.name}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
            </div>

            <Tabs defaultValue="servers" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl h-14 border border-border/40">
                    <TabsTrigger value="servers" className="rounded-xl px-8 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold tracking-tight">
                        Servers ({servers.length})
                    </TabsTrigger>
                    <TabsTrigger value="databases" className="rounded-xl px-8 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold tracking-tight">
                        Databases ({databases.length})
                    </TabsTrigger>
                    <TabsTrigger value="clusters" className="rounded-xl px-8 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold tracking-tight">
                        Clusters ({clusters.length})
                    </TabsTrigger>
                    <TabsTrigger value="web" className="rounded-xl px-8 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold tracking-tight">
                        Web ({webMonitors.length})
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-xl px-8 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold tracking-tight">
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="servers">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {servers.length === 0 ? (
                            <EmptyState icon={<Server />} message="No servers in this project." />
                        ) : (
                            servers.map(server => (
                                <Card key={server.id} className="border-border/40 bg-card/50 overflow-hidden group">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <Server className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-bold">{server.name || server.hostname}</CardTitle>
                                                    <CardDescription className="font-mono text-[10px]">{server.ipAddress}</CardDescription>
                                                </div>
                                            </div>
                                            <StatusBadge lastSeen={(server as any).lastSeen} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <UsageBar
                                                label="CPU Usage"
                                                value={(server as any).metrics?.[0]?.cpuUsage ?? 0}
                                            />
                                            <UsageBar
                                                label="Memory"
                                                value={(server as any).metrics?.[0]?.memoryUsage ?? 0}
                                                className="memory-usage-bar"
                                            />
                                        </div>

                                        <ProcessList processes={(server as any).metrics?.[0]?.topProcesses} />
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="databases">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {databases.length === 0 ? (
                            <EmptyState icon={<Database />} message="No databases in this project." />
                        ) : (
                            databases.map(db => (
                                <Card key={db.id} className="border-border/40 bg-card/50">
                                    <CardHeader>
                                        <div className="flex justify-between">
                                            <div className="flex items-center gap-3">
                                                <Database className="h-5 w-5 text-emerald-500" />
                                                <CardTitle>{db.name}</CardTitle>
                                            </div>
                                            <StatusBadge lastSeen={(db as any).lastSeen} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-mono text-muted-foreground">{db.engine} {db.version}</p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="web">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {webMonitors.length === 0 ? (
                            <EmptyState icon={<Globe />} message="No web monitors in this project." />
                        ) : (
                            webMonitors.map(monitor => (
                                <Card key={monitor.id} className="border-border/40 bg-card/50 overflow-hidden group hover:bg-muted/20 transition-colors">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                                    <Globe className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <CardTitle className="text-lg font-bold">{monitor.name}</CardTitle>
                                                    <CardDescription className="text-[10px] truncate max-w-[200px]">{monitor.url}</CardDescription>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                monitor.lastStatus === 'up' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                                                    monitor.lastStatus === 'down' ? "text-destructive bg-destructive/10 border-destructive/20" :
                                                        "text-secondary bg-secondary/10 border-secondary/20"
                                            )}>
                                                {monitor.lastStatus || 'pending'}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between text-xs">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Activity className="h-3 w-3" />
                                                Response Time
                                            </div>
                                            <div className="font-bold">{monitor.metrics?.[0]?.responseTime ?? 0}ms</div>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Shield className="h-3 w-3" />
                                                SSL Status
                                            </div>
                                            <div className={cn("font-bold truncate max-w-[150px]", monitor.sslStatus === 'valid' ? 'text-emerald-500' : 'text-amber-500')}>
                                                {monitor.sslExpiryDate ? format(new Date(monitor.sslExpiryDate), "MMM dd, yyyy") : 'N/A'}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="settings">
                    <ProjectSettings projectId={project.id} />
                </TabsContent>
            </Tabs>
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

function ProjectSettings({ projectId }: { projectId: number }) {
    const { data: settings, isLoading } = useProjectAlertSettings(projectId);
    const updateSettings = useUpdateProjectAlertSettings(projectId);
    const { toast } = useToast();
    const [newRecipient, setNewRecipient] = useState("");

    const form = useForm<any>({
        values: settings ? {
            ...settings,
            alertRecipients: (settings.alertRecipients || []).map((email: string) => ({ email }))
        } : {
            alertRecipients: [],
            companyName: "",
            logoUrl: "",
            cpuThreshold: 80,
            memoryThreshold: 80,
            storageThreshold: 80,
        }
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

    if (isLoading) return <div className="text-center py-12 animate-pulse">Loading project settings...</div>;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
                const submissionData = {
                    ...data,
                    alertRecipients: (data.alertRecipients || []).map((r: any) => r.email)
                };
                updateSettings.mutate(submissionData, {
                    onSuccess: () => toast({ title: "Success", description: "Project settings updated successfully." })
                });
            })} className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Bell className="h-5 w-5 text-indigo-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Alert Configuration</CardTitle>
                                    <CardDescription>Configure project-specific alert settings.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Alert Recipient Emails</FormLabel>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="admin@example.com"
                                        className="h-10 bg-muted/20 border-border/40 rounded-xl"
                                        value={newRecipient}
                                        onChange={(e) => setNewRecipient(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddRecipient();
                                            }
                                        }}
                                    />
                                    <Button type="button" onClick={handleAddRecipient} className="h-10 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border-0">
                                        <Plus className="h-4 w-4 mr-2" /> Add
                                    </Button>
                                </div>

                                <div className="rounded-xl border border-border/40 overflow-hidden bg-background/30">
                                    <Table>
                                        <TableBody>
                                            {fields.map((field: any, index) => (
                                                <TableRow key={field.id} className="border-border/40">
                                                    <TableCell className="py-2 text-sm font-medium">{field.email}</TableCell>
                                                    <TableCell className="py-2 text-right">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                            onClick={() => remove(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {fields.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="py-4 text-center text-xs text-muted-foreground italic">
                                                        No recipients added yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="pt-6 space-y-4 border-t border-border/30">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                                    <Globe className="h-3 w-3" /> Branding
                                </h4>
                                <FormField
                                    control={form.control}
                                    name="companyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Company Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Acme Corp" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="logoUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Logo URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/logo.png" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Bell className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Alert Thresholds</CardTitle>
                                    <CardDescription>Define when to trigger notifications for this project.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="cpuThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">CPU Threshold (%)</FormLabel>
                                            <span className="font-bold text-primary">{field.value}%</span>
                                        </div>
                                        <FormControl>
                                            <Input type="range" min="0" max="100" step="1" className="accent-primary h-2 cursor-pointer" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="memoryThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Memory Threshold (%)</FormLabel>
                                            <span className="font-bold text-primary">{field.value}%</span>
                                        </div>
                                        <FormControl>
                                            <Input type="range" min="0" max="100" step="1" className="accent-primary h-2 cursor-pointer" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="storageThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center mb-1">
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Storage Threshold (%)</FormLabel>
                                            <span className="font-bold text-primary">{field.value}%</span>
                                        </div>
                                        <FormControl>
                                            <Input type="range" min="0" max="100" step="1" className="accent-primary h-2 cursor-pointer" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>
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
