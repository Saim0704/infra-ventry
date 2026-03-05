import { useServer } from "@/hooks/use-servers";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageBar } from "@/components/ui/UsageBar";
import { format } from "date-fns";
import { Server, Activity, CircuitBoard, Cpu, Folder } from "lucide-react";

interface ServerDetailViewProps {
    id: number | null;
}

export function ServerDetailView({ id }: ServerDetailViewProps) {
    const { data: server, isLoading } = useServer(id);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
    if (!server) return null;

    // The detail view returns all metrics, we want the latest for current status
    const lastMetric = server.metrics?.[server.metrics.length - 1];
    const hasProcesses = lastMetric?.topProcesses && Array.isArray(lastMetric.topProcesses) && lastMetric.topProcesses.length > 0;

    return (
        <div className="py-2 h-[60vh] flex flex-col">
            <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="processes">Processes</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Info & OS */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                    <Server className="h-4 w-4" /> System Identity
                                </h3>
                                <div className="bg-secondary/20 rounded-xl p-5 border border-border/50 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Display Name</span>
                                        <span className="font-bold text-primary">{server.name || "None"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Hostname</span>
                                        <span className="font-mono font-medium">{server.hostname}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">IP Address</span>
                                        <span className="font-mono text-primary font-medium">{server.ipAddress || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Project</span>
                                        <div className="flex items-center gap-1.5 font-bold text-primary">
                                            <Folder className="h-3.5 w-3.5" />
                                            <span>{(server as any).project?.name || "None"}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Operating System</span>
                                        <span className="font-medium text-foreground">{server.os || "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">OS Version</span>
                                        <span className="text-foreground">{server.osVersion || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">SSH User</span>
                                        <span className="font-mono font-bold text-primary">{server.sshUser || "root"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">SSH Key/Identity</span>
                                        <span className="font-mono text-xs truncate max-w-[120px]">{server.sshKey || "None"}</span>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> Connectivity
                                </h3>
                                <div className="bg-secondary/20 rounded-xl p-5 border border-border/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Last Communication</span>
                                        <span className="text-sm font-medium">
                                            {server.lastSeen ? format(new Date(server.lastSeen), "MMM d, yyyy HH:mm:ss") : "Never"}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Hardware & Resources */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                    <CircuitBoard className="h-4 w-4" /> Hardware Profile
                                </h3>
                                <div className="bg-secondary/20 rounded-xl p-5 border border-border/50 grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Processors</p>
                                        <p className="text-xl font-bold">{server.cpuCores}</p>
                                        <p className="text-[10px] text-muted-foreground">vCPUs</p>
                                    </div>
                                    <div className="border-x border-border/50">
                                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Memory</p>
                                        <p className="text-xl font-bold">{server.totalRam} GB</p>
                                        <p className="text-[10px] text-muted-foreground">RAM</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Storage</p>
                                        <p className="text-xl font-bold">{server.totalDisk} GB</p>
                                        <p className="text-[10px] text-muted-foreground">Disk</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                    <Cpu className="h-4 w-4" /> Current Utilization
                                </h3>
                                <div className="space-y-5 bg-secondary/10 rounded-xl p-5 border border-border/50">
                                    <UsageBar value={lastMetric?.cpuUsage || 0} label="CPU Load" />
                                    <UsageBar value={lastMetric?.memoryUsage || 0} label="RAM Consumption" />
                                    <UsageBar value={lastMetric?.diskUsage || 0} label="Disk Occupancy" />
                                </div>
                            </section>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="processes" className="flex-1 overflow-y-auto pr-2 mt-0">
                    {hasProcesses ? (
                        <section className="h-full flex flex-col">
                            <div className="bg-secondary/20 rounded-xl border border-border/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="border-border/50 hover:bg-transparent">
                                            <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground pl-6">PID</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground w-full">Process Name</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground text-right">CPU %</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-bold text-muted-foreground text-right pr-6">Mem %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(lastMetric!.topProcesses as any[]).map((proc: any, idx: number) => (
                                            <TableRow key={idx} className="border-border/40 hover:bg-muted/20">
                                                <TableCell className="py-2.5 font-mono text-xs pl-6">{proc.pid}</TableCell>
                                                <TableCell className="py-2.5 font-medium text-sm">{proc.name}</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-xs">{proc.cpu}%</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-xs pr-6">{proc.memory}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border border-dashed rounded-xl border-border/50">
                            <Activity className="h-8 w-8 mb-2 opacity-50" />
                            <p>No process data available currently.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
