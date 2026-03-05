import { useDashboardStats } from "@/hooks/use-dashboard";
import { Shell } from "@/components/layout/Shell";
import { MetricCard } from "@/components/ui/MetricCard";
import { Server, Database, Cloud, AlertTriangle, Activity, Plus, Github, ArrowRight, Globe, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <Shell title="Dashboard" description="Overview of your infrastructure health and metrics.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <Link href="/servers">
              <div className="cursor-pointer">
                <MetricCard
                  title="Total Servers"
                  value={stats?.totalServers || 0}
                  icon={Server}
                  className="border-blue-500/20"
                  description={`${stats?.healthyServers || 0} Healthy`}
                />
              </div>
            </Link>
            <Link href="/databases">
              <div className="cursor-pointer">
                <MetricCard
                  title="Total Databases"
                  value={stats?.totalDatabases || 0}
                  icon={Database}
                  className="border-indigo-500/20"
                  description="Active instances"
                />
              </div>
            </Link>
            <Link href="/web-monitoring">
              <div className="cursor-pointer">
                <MetricCard
                  title="Web Monitors"
                  value={stats?.totalWebMonitors || 0}
                  icon={Activity}
                  className="border-emerald-500/20"
                  description="Uptime monitoring"
                />
              </div>
            </Link>
            <Link href="/settings?tab=history">
              <div className="cursor-pointer">
                <MetricCard
                  title="Critical Alerts"
                  value={stats?.criticalServers || 0}
                  icon={AlertTriangle}
                  className={stats?.criticalServers ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/20"}
                  description="Servers requiring attention"
                />
              </div>
            </Link>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/30 shadow-xl bg-card/30 backdrop-blur-sm overflow-hidden group">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                System Status
              </CardTitle>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed border-border/50 group-hover:bg-secondary/20 transition-colors">
              <Zap className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Global infrastructure telemetry chart</p>
              <p className="text-xs opacity-50">Visualizing real-time resource utilization across all regions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/30 shadow-xl bg-card/30 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common setup tasks and management views.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Link href="/projects">
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-500 text-sm flex items-center gap-2">
                    Add New Project
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Create a workspace for your resources.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </Link>

            <Link href="/settings?tab=tokens">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer group flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                    Add New Agents
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Generate tokens for ingestion via VM or K8s.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </Link>

            <Link href="/web-monitoring">
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-500 text-sm flex items-center gap-2">
                    Monitor New URL
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Setup periodic uptime & SSL checks.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </Link>

            <Link href="/settings?tab=history">
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer group flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-rose-500 text-sm flex items-center gap-2">
                    View Alert History
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Audit previous system warnings and errors.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-rose-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
