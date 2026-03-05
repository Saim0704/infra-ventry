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
                <Skeleton className="h-32 w-full max-w-7xl rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-7xl">
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

    const { project, servers = [], databases = [], clusters = [], webMonitors = [], domainMonitors = [] } = status;
    const domainThreshold = project?.domainExpiryThreshold || 30;
    const allUp = [...servers, ...databases, ...clusters, ...webMonitors].every(r => r.status === 'up') &&
        domainMonitors.every((d: any) => {
            const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
            const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
            return d.status === 'active' && (daysLeft === null || daysLeft > domainThreshold);
        });

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-primary/30">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent pt-12 pb-12">
                <div className="container max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                <Activity className="h-3 w-3 text-primary" />
                                Live System Status
                            </div>

                            <div className="flex items-center gap-6">
                                {project.logoUrl && (
                                    <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/10 p-3 flex items-center justify-center overflow-hidden shadow-2xl">
                                        <img src={project.logoUrl} alt={project.name} className="max-h-full max-w-full object-contain" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight italic bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent pb-1 leading-normal">
                                        {project.name}
                                    </h1>
                                    <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                        System Infrastructure Overview
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={cn(
                            "flex items-center gap-6 p-6 rounded-[2rem] border transition-all duration-500",
                            allUp ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)]" : "bg-amber-500/5 border-amber-500/20 shadow-[0_20px_40px_-15px_rgba(245,158,11,0.1)]"
                        )}>
                            <div className={cn(
                                "h-14 w-14 rounded-2xl flex items-center justify-center",
                                allUp ? "bg-emerald-500/10" : "bg-amber-500/10"
                            )}>
                                {allUp ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <AlertCircle className="h-8 w-8 text-amber-500" />}
                            </div>
                            <div>
                                <div className="text-2xl font-black italic uppercase tracking-tighter">
                                    {allUp ? "All Systems Operational" : "Partial Degraded Service"}
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
                                    <div className={cn("h-1.5 w-1.5 rounded-full", allUp ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse")} />
                                    Updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated background element */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] -mr-64 -mt-64 animate-pulse opacity-40 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -ml-48 -mb-48 opacity-30 pointer-events-none" />
            </div>

            <main className="container max-w-7xl mx-auto px-6 py-12 space-y-16">
                {/* Web Monitors Section */}
                {webMonitors.length > 0 && (
                    <section className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-3">
                                <Activity className="h-4 w-4 text-primary" /> Web Performance & Uptime
                            </h2>
                            <div className="h-px flex-1 mx-8 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {webMonitors.map((m: any) => (
                                <WebMonitorCard
                                    key={m.name}
                                    name={m.name}
                                    url={m.url}
                                    status={m.status}
                                    responseTime={m.responseTime}
                                    history={m.history}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Domain Monitors Section */}
                {domainMonitors.length > 0 && (
                    <section className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-3">
                                <Globe className="h-4 w-4 text-indigo-500" /> Domain Health & Expiry
                            </h2>
                            <div className="h-px flex-1 mx-8 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {domainMonitors.map((d: any) => {
                                const expiry = d.expiryDate ? new Date(d.expiryDate) : null;
                                const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                                let statusText = 'Monitored';
                                let statusColor = 'text-emerald-400';

                                if (daysLeft !== null && daysLeft <= domainThreshold) {
                                    statusText = 'Expiring Soon';
                                    statusColor = 'text-rose-400';
                                } else if (daysLeft !== null && daysLeft <= 60) {
                                    statusText = 'Expiring';
                                    statusColor = 'text-amber-400';
                                } else if (d.status === 'error') {
                                    statusText = 'Check Failed';
                                    statusColor = 'text-rose-400';
                                }

                                return (
                                    <StatusCard
                                        key={d.domain}
                                        name={d.domain}
                                        sub="Domain"
                                        icon={Globe}
                                        status={d.status === 'active' && (daysLeft === null || daysLeft > domainThreshold) ? 'up' : 'down'}
                                        metric={daysLeft !== null ? `${daysLeft} days` : (d.status === 'error' ? 'Error' : 'Pending')}
                                        metricLabel="Expires In"
                                        customStatusText={statusText}
                                        customStatusColor={statusColor}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Infrastructure Section */}
                {(servers.length > 0 || databases.length > 0 || clusters.length > 0) && (
                    <section className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50 flex items-center gap-3">
                                <Server className="h-4 w-4 text-emerald-500" /> Infrastructure Health
                            </h2>
                            <div className="h-px flex-1 mx-8 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {servers.map((s: any) => (
                                <StatusCard
                                    key={s.name}
                                    name={s.name}
                                    sub="Server"
                                    icon={Server}
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
                                    icon={Database}
                                    status={d.status}
                                    metric={d.lastSeen ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true }) : 'Never'}
                                    metricLabel="Last Seen"
                                />
                            ))}
                            {clusters.map((c: any) => (
                                <StatusCard
                                    key={c.name}
                                    name={c.name}
                                    sub="K8s Cluster"
                                    icon={Shield}
                                    status={c.status}
                                    metric={c.lastSeen ? formatDistanceToNow(new Date(c.lastSeen), { addSuffix: true }) : 'Never'}
                                    metricLabel="Last Seen"
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="container max-w-7xl mx-auto px-6 py-16 border-t border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        &copy; {new Date().getFullYear()} {project.name} &bull; All Systems Monitored
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Powered by <span className="text-primary italic">InfraWatch</span> Pro
                    </p>
                </div>
            </footer>
        </div>
    );
}

function Heartbeat({ history = [] }: { history: any[] }) {
    // Fill up to 40 slots
    // history is oldest first (history[0] is oldest)
    // We want the newest data on the far right (index 39)
    const slots = Array(40).fill(null).map((_, i) => {
        const historyIndex = i - (40 - history.length);
        if (historyIndex >= 0 && historyIndex < history.length) {
            return { ...history[historyIndex], isPending: false };
        }
        return { isPending: true };
    });

    return (
        <div className="flex gap-[3px] h-8 items-end">
            {slots.map((s, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-[6px] rounded-full transition-all duration-300",
                        s.isPending ? "h-3 bg-white/10" : (s.isUp ? "h-8 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]" : "h-8 bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.4)]")
                    )}
                    title={s.isPending ? "No data" : `${s.isUp ? 'UP' : 'DOWN'} - ${new Date(s.createdAt).toLocaleString()} (${s.responseTime}ms)`}
                />
            ))}
        </div>
    );
}

function WebMonitorCard({ name, url, status, responseTime, history }: any) {
    const isUp = status === 'up';

    return (
        <Card className="bg-[#0a0a0a] border-white/5 hover:border-white/10 transition-all group overflow-hidden rounded-[2rem] shadow-xl">
            <CardContent className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "h-16 w-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-black italic border transition-all duration-300",
                            isUp ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse"
                        )}>
                            {isUp ? "UP" : "DN"}
                        </div>
                        <div>
                            <div className="font-bold text-2xl tracking-tight leading-normal mb-2 text-white">{name}</div>
                            <div className="flex items-center gap-3">
                                <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1">
                                    {url} <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                                {responseTime && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-white/10" />
                                        <div className="text-[10px] font-black italic text-primary/80">{responseTime}ms</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        <Heartbeat history={history} />
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                            Last 40 Health Checks &bull; Real-time Performance
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusCard({ name, sub, icon: Icon, status, metric, metricLabel, customStatusText, customStatusColor }: any) {
    const isUp = status === 'up';

    return (
        <Card className="bg-[#0a0a0a] border-white/5 hover:border-white/10 transition-all group overflow-hidden rounded-[1.5rem] relative">
            <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                isUp ? "bg-emerald-500/40" : (customStatusColor && customStatusColor.includes('amber') ? "bg-amber-500/40 animate-pulse" : "bg-rose-500/40 animate-pulse")
            )} />
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                            isUp ? "bg-emerald-500/5 text-emerald-500 border border-emerald-500/10" : "bg-rose-500/5 text-rose-500 border border-rose-500/10"
                        )}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors leading-normal text-white">{name}</div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{sub}</div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className={cn(
                            "text-[10px] font-black italic mb-1 uppercase tracking-tighter",
                            customStatusColor ? customStatusColor : (isUp ? "text-emerald-400" : "text-rose-400")
                        )}>
                            {customStatusText ? customStatusText : (isUp ? 'Operational' : 'Degraded')}
                        </div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{metric}</div>
                        <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-0.5">{metricLabel}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { ExternalLink } from "lucide-react";
