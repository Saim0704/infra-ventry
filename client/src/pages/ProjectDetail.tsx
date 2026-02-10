import { useProjectResources } from "@/hooks/use-projects";
import { useCreateToken } from "@/hooks/use-tokens";
import { useLocation, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Database, Cloud, Terminal, Plus, Activity, Layout, ChevronLeft, Globe, Shield, Key } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/ui/UsageBar";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { RegistrationModal } from "@/components/RegistrationModal";

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

    const { project, servers, databases, clusters } = resources;

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

                <TabsContent value="clusters">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {clusters.length === 0 ? (
                            <EmptyState icon={<Cloud />} message="No clusters in this project." />
                        ) : (
                            clusters.map(cluster => (
                                <Card key={cluster.id} className="border-border/40 bg-card/50">
                                    <CardHeader>
                                        <div className="flex justify-between">
                                            <div className="flex items-center gap-3">
                                                <Cloud className="h-5 w-5 text-amber-500" />
                                                <CardTitle>{cluster.name}</CardTitle>
                                            </div>
                                            <StatusBadge lastSeen={(cluster as any).lastSeen} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-mono text-muted-foreground">Version: {cluster.version}</p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
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
