import { useCluster } from "@/hooks/use-clusters";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Cpu, Cloud } from "lucide-react";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ClusterMetric } from "@shared/schema";

interface ClusterDetailViewProps {
    id: number | null;
}

export function ClusterDetailView({ id }: ClusterDetailViewProps) {
    const { data: cluster, isLoading } = useCluster(id);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full rounded-2xl" /></div>;
    if (!cluster) return null;

    const chartData = (cluster.metrics as ClusterMetric[]).slice(-20).map(m => ({
        time: format(new Date(m.createdAt || new Date()), "HH:mm"),
        cpu: m.cpuUsage,
        memory: m.memoryUsage,
        pods: m.podCount
    }));

    return (
        <div className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-secondary/10 border-border/50 rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Box className="h-3 w-3" />
                            Active Pods
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{cluster.metrics[0]?.podCount ?? 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-secondary/10 border-border/50 rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Cpu className="h-3 w-3" />
                            Cluster CPU %
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{cluster.metrics[0]?.cpuUsage?.toFixed(1) ?? 0}%</div>
                    </CardContent>
                </Card>
                <Card className="bg-secondary/10 border-border/50 rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Cloud className="h-3 w-3" />
                            Nodes
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{cluster.nodeCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 italic">
                    <Cpu className="h-4 w-4 text-primary" />
                    Resource Utilization
                </h3>
                <div className="h-[300px] w-full bg-card border border-border/50 rounded-3xl p-6 shadow-inner overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCpuCluster" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpuCluster)" strokeWidth={3} animationDuration={1500} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
