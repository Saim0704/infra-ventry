import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Server, Database, Activity, Shield, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function StatusPage() {
    const { slug } = useParams();

    const { data: status, isLoading, error } = useQuery<any>({
        queryKey: [api.projects.status.path, slug as string],
        queryFn: async () => {
            const url = buildUrl(api.projects.status.path, { slug: slug as string });
            const res = await fetch(url);
            if (!res.ok) throw new Error("Status page not found");
            return res.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-8 flex flex-col items-center justify-center space-y-8">
                <Skeleton className="h-12 w-64 rounded-xl" />
                <Skeleton className="h-32 w-full max-w-4xl rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Status Page Not Found</h1>
                <p className="text-muted-foreground">The project or status page you are looking for does not exist.</p>
            </div>
        );
    }

    const { project, servers, databases, webMonitors } = status;
    const allUp = [...servers, ...databases, ...webMonitors].every(r => r.status === 'up');

    return (
        <div className="min-h-screen bg-[#050505] text-foreground font-sans selection:bg-primary/30">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent pt-20 pb-16">
                <div className="container max-w-5xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                <Activity className="h-3 w-3" />
                                Live System Status
                            </div>
                            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter italic bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                                {project.name}
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-xl font-medium">
                                {project.description || "Real-time health overview of all project resources."}
                            </p>
                        </div>

                        <div className={cn(
                            "flex flex-col items-center gap-3 p-6 rounded-3xl border backdrop-blur-md transition-all duration-500",
                            allUp ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]" : "bg-amber-500/10 border-amber-500/20 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)]"
                        )}>
                            {allUp ? <CheckCircle2 className="h-12 w-12 text-emerald-500" /> : <AlertCircle className="h-12 w-12 text-amber-500" />}
                            <div className="text-center">
                                <div className="text-2xl font-black italic uppercase tracking-tighter">
                                    {allUp ? "All Systems Operational" : "Partial Degraded Service"}
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated background element */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse opacity-50" />
            </div>

            <main className="container max-w-5xl mx-auto px-6 py-12 space-y-12">
                {/* Web Monitors Section */}
                {webMonitors.length > 0 && (
                    <section className="space-y-6">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 px-2">
                            <Globe className="h-4 w-4" /> Web Monitors
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {webMonitors.map((m: any) => (
                                <StatusCard
                                    key={m.name}
                                    name={m.name}
                                    sub={m.url}
                                    status={m.status}
                                    metric={m.responseTime ? `${m.responseTime}ms` : null}
                                    metricLabel="Response"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Infrastructure Section */}
                {(servers.length > 0 || databases.length > 0) && (
                    <section className="space-y-6">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2 px-2">
                            <Server className="h-4 w-4" /> Infrastructure
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {servers.map((s: any) => (
                                <StatusCard
                                    key={s.name}
                                    name={s.name}
                                    sub="Server"
                                    status={s.status}
                                    metric={s.lastSeen ? formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true }) : 'Never'}
                                    metricLabel="Last Seen"
                                />
                            ))}
                            {databases.map((d: any) => (
                                <StatusCard
                                    key={d.name}
                                    name={d.name}
                                    sub="Database"
                                    status={d.status}
                                    metric={d.lastSeen ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true }) : 'Never'}
                                    metricLabel="Last Seen"
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="container max-w-5xl mx-auto px-6 py-12 border-t border-white/5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Powered by <span className="text-primary italic">InfraWatch</span> Monitoring
                </p>
            </footer>
        </div>
    );
}

function StatusCard({ name, sub, status, metric, metricLabel }: any) {
    const isUp = status === 'up';

    return (
        <Card className="bg-[#111] border-white/5 hover:border-white/10 transition-all group overflow-hidden rounded-2xl">
            <CardContent className="p-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-3 w-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                            isUp ? "bg-emerald-500 shadow-emerald-500/50" : "bg-destructive shadow-destructive/50 animate-pulse"
                        )} />
                        <div>
                            <div className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{name}</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[200px]">{sub}</div>
                        </div>
                    </div>

                    {metric && (
                        <div className="text-right">
                            <div className="text-xs font-black italic">{metric}</div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{metricLabel}</div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
