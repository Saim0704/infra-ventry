import { useWebMonitor } from "@/hooks/use-web-monitors";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Clock, Shield } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { WebMonitorMetric } from "@shared/schema";

interface MonitorDetailViewProps {
    id: number | null;
}

export function MonitorDetailView({ id }: MonitorDetailViewProps) {
    const { data: monitor, isLoading } = useWebMonitor(id);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full rounded-2xl" /></div>;
    if (!monitor) return null;

    const chartData = (monitor.metrics as WebMonitorMetric[]).slice(-30).map(m => ({
        time: format(new Date(m.createdAt || new Date()), "HH:mm"),
        ms: m.responseTime,
        isUp: m.isUp ? 1 : 0
    }));

    const avgResponse = Math.round(chartData.reduce((acc: number, curr) => acc + (curr.ms || 0), 0) / (chartData.length || 1));
    const uptimePct = Math.round((chartData.filter(d => d.isUp).length / (chartData.length || 1)) * 100);

    return (
        <div className="space-y-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Activity className="h-3 w-3" />
                            Uptime (Last 30)
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{uptimePct}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-primary mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Clock className="h-3 w-3" />
                            Avg Response
                        </div>
                        <div className="text-4xl font-black font-display italic group-hover:scale-105 transition-transform">{avgResponse}ms</div>
                    </CardContent>
                </Card>

                <Card className="bg-accent/5 border-accent/20 shadow-none rounded-2xl overflow-hidden group">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-accent mb-2 font-bold uppercase tracking-widest text-[10px]">
                            <Shield className="h-3 w-3" />
                            SSL Expiry
                        </div>
                        <div className="text-lg font-black font-display italic">
                            {monitor.sslExpiryDate ? format(new Date(monitor.sslExpiryDate), "MMM dd, yyyy") : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                            {monitor.sslExpiryDate ? formatDistanceToNow(new Date(monitor.sslExpiryDate), { addSuffix: true }) : ''}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 italic">
                        <Activity className="h-4 w-4 text-primary" />
                        Performance History
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Response Time (ms)</span>
                </div>
                <div className="h-[250px] w-full bg-card border border-border/50 rounded-3xl p-6 shadow-inner overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="ms"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMs)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
