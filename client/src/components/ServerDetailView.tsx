import { useServer } from "@/hooks/use-servers";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageBar } from "@/components/ui/UsageBar";
import { format } from "date-fns";
import { Server, Activity, CircuitBoard, Cpu, Folder, Package } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const serviceVersions = server.serviceVersions as Record<string, string> | null;
    const hasServices = serviceVersions && Object.keys(serviceVersions).length > 0;

    return (
        <div className="py-2 h-[60vh] flex flex-col">
            <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col">
                <TabsList className="w-full grid grid-cols-3 bg-muted/20 p-1.5 rounded-2xl mb-6 border border-border/40">
                    <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 font-bold tracking-tight py-2">Overview</TabsTrigger>
                    <TabsTrigger value="processes" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 font-bold tracking-tight py-2">Processes</TabsTrigger>
                    <TabsTrigger value="services" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 font-bold tracking-tight py-2">Services</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 overflow-y-auto pr-2 mt-0">
                    <div className="space-y-8">
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
                                        <span className="font-medium text-foreground">
                                            {server.os || "Unknown"}
                                            {server.osVersion ? `:v${server.osVersion}` : ""}
                                        </span>
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
                                            <p className="text-xl font-bold">{Number(server.totalRam).toFixed(2)} GB</p>
                                            <p className="text-[10px] text-muted-foreground">RAM Capacity</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Storage</p>
                                            <p className="text-xl font-bold">{Number(server.totalDisk).toFixed(2)} GB</p>
                                            <p className="text-[10px] text-muted-foreground">Disk Capacity</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                        <Cpu className="h-4 w-4" /> Current Utilization
                                    </h3>
                                    <div className="space-y-5 bg-secondary/10 rounded-xl p-5 border border-border/50">
                                        <UsageBar value={lastMetric?.cpuUsage || 0} label="CPU Load" />
                                        <UsageBar 
                                            value={lastMetric?.memoryUsage || 0} 
                                            label={`RAM Consumption: ${Math.round(((lastMetric?.memoryUsage || 0) / 100) * (server.totalRam || 0))} / ${Math.round(server.totalRam || 0)} GB`} 
                                        />
                                        <UsageBar 
                                            value={lastMetric?.diskUsage || 0} 
                                            label={`Disk Occupancy: ${Math.round(((lastMetric?.diskUsage || 0) / 100) * (server.totalDisk || 0))} / ${Math.round(server.totalDisk || 0)} GB`} 
                                        />
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Full-width Communication Footer */}
                        <section className="mt-auto">
                            <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 flex items-center justify-between group hover:bg-primary/10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Last System Communication</h3>
                                        <p className="text-base font-bold tracking-tight text-foreground">
                                            {server.lastSeen ? format(new Date(server.lastSeen), "MMMM d, yyyy 'at' HH:mm:ss") : "Never connected"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-mono font-bold text-muted-foreground/60 uppercase">Status</span>
                                    <span className="text-sm font-black text-emerald-500 italic">CONNECTED</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </TabsContent>

                <TabsContent value="processes" className="flex-1 overflow-y-auto pr-2 mt-0">
                    {hasProcesses ? (
                        <section className="h-full flex flex-col space-y-4">
                            <div className="flex items-center justify-between bg-secondary/10 p-4 rounded-xl border border-border/40">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest">Active Processes</h3>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">Updated in real-time</span>
                            </div>
                            <div className="bg-secondary/20 rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                        <TableRow className="border-border/50 hover:bg-transparent">
                                            <TableHead className="h-10 text-[10px] uppercase font-black text-muted-foreground/70 pl-6">PID</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-black text-muted-foreground/70 w-full">Process Name</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-black text-muted-foreground/70 text-right">CPU Usage</TableHead>
                                            <TableHead className="h-10 text-[10px] uppercase font-black text-muted-foreground/70 text-right pr-6">Mem Usage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(lastMetric!.topProcesses as any[]).map((proc: any, idx: number) => (
                                            <TableRow key={idx} className="border-border/10 hover:bg-primary/5 transition-colors group">
                                                <TableCell className="py-3 font-mono text-[10px] pl-6 text-muted-foreground">{proc.pid}</TableCell>
                                                <TableCell className="py-3 font-bold text-sm tracking-tight">{proc.name}</TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                                                        Number(proc.cpu) > 50 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-primary/10 text-primary border-primary/20"
                                                    )}>
                                                        {Number(proc.cpu).toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-3 text-right pr-6">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                                                        Number(proc.memory) > 50 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    )}>
                                                        {Number(proc.memory).toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border border-dashed rounded-3xl border-border/50 bg-muted/5">
                            <Activity className="h-10 w-10 mb-4 opacity-20" />
                            <p className="font-bold italic">No process data</p>
                            <p className="text-[10px] mt-1">Check if the agent is running correctly.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="services" className="flex-1 overflow-y-auto pr-2 mt-0">
                    <div className="flex flex-col h-full space-y-6">
                        {hasServices ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(serviceVersions!).map(([service, version]) => (
                                    <div key={service} className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/40 group hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{service}</p>
                                                <p className="text-sm font-bold tracking-tight">{version}</p>
                                            </div>
                                        </div>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 border border-dashed rounded-3xl border-border/50 bg-muted/5">
                                <Package className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-lg font-black italic">No Audit Data</p>
                                <p className="text-xs font-medium text-muted-foreground mt-1">Run the service audit script on this server to populate this view.</p>
                                <div className="mt-6 p-4 bg-card rounded-2xl border border-border/50 w-full max-w-md font-mono text-[10px] overflow-x-auto">
                                    <code className="text-primary"># Recommended Monthly Audit Cron:<br/>0 0 1 * * /path/to/audit_services.sh https://domain.com ag_token</code>
                                </div>
                            </div>
                        )}

                        {/* Full-width Audit Footer - Consolidated for both cases if lastAuditAt exists */}
                        {server.lastAuditAt && (
                            <section className="mt-auto pt-4">
                                <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 flex items-center justify-between group hover:bg-primary/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <CircuitBoard className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Last Comprehensive Audit</h3>
                                            <p className="text-base font-bold tracking-tight text-foreground">
                                                {format(new Date(server.lastAuditAt), "MMMM d, yyyy 'at' HH:mm:ss")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-mono font-bold text-muted-foreground/60 uppercase">Scope</span>
                                        <span className="text-sm font-black text-primary italic">FULL SYSTEM SCAN</span>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
