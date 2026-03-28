import { useDashboardStats } from "@/hooks/use-dashboard";
import { Shell } from "@/components/layout/Shell";
import { MetricCard } from "@/components/ui/MetricCard";
import { Server, Database, Cloud, AlertTriangle, Activity, Plus, Github, ArrowRight, Globe, Zap, Gift, ShieldCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useAuth();
  const [showTrialPopup, setShowTrialPopup] = useState(false);

  useEffect(() => {
    if (user?.plan === 'trial') {
      const dismissed = localStorage.getItem(`trial_popup_${user.id}`);
      if (!dismissed) {
        setShowTrialPopup(true);
      }
    }
  }, [user]);

  const handleDismiss = () => {
    setShowTrialPopup(false);
    if (user?.id) {
      localStorage.setItem(`trial_popup_${user.id}`, "true");
    }
  };

  const daysLeft = user?.trialExpiresAt 
    ? Math.max(0, Math.ceil((new Date(user.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) 
    : 0;

  const totalResources = (stats?.totalServers || 0) + 
                         (stats?.totalDatabases || 0) + 
                         (stats?.totalClusters || 0) + 
                         (stats?.totalWebMonitors || 0) + 
                         (stats?.totalDomainMonitors || 0);

  const projectUsage = ((stats?.totalProjects || 0) / 5) * 100;
  const resourceUsage = (totalResources / 30) * 100;

  return (
    <>
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

    <Dialog open={showTrialPopup} onOpenChange={setShowTrialPopup}>
      <DialogContent className="sm:max-w-[500px] border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent flex items-center justify-center">
          <div className="absolute top-4 right-4">
             <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold">
               <Clock className="h-3 w-3 mr-1" /> {daysLeft} Days Left
             </Badge>
          </div>
          <div className="h-16 w-16 rounded-3xl bg-primary shadow-[0_0_30px_rgba(var(--primary),0.3)] flex items-center justify-center text-primary-foreground transform -rotate-6">
            <Gift className="h-8 w-8" />
          </div>
        </div>
        
        <div className="p-8 pt-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              Welcome to Your Trial Period!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium pt-2">
              You've successfully joined <span className="text-primary font-bold">Infra-Ventry</span>. You are currently on the <span className="font-bold underline decoration-primary/30 underline-offset-4 decoration-2">Trial Plan</span> with access to all premium features.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/70">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Projects Limit</span>
                <span>{stats?.totalProjects || 0} / 5</span>
              </div>
              <Progress value={projectUsage} className="h-2 bg-primary/10" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/70">
                <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-indigo-500" /> Resource Limit</span>
                <span>{totalResources} / 30</span>
              </div>
              <Progress value={resourceUsage} className="h-2 bg-indigo-500/10" />
              <p className="text-[10px] text-muted-foreground/60 font-medium italic">Includes Servers, Databases, Clusters & Web Monitors</p>
            </div>
          </div>

          <DialogFooter className="mt-10 gap-3 sm:justify-start">
            <Button onClick={handleDismiss} className="w-full font-bold shadow-lg shadow-primary/20 h-11">
              Start Monitoring
            </Button>
            <Button variant="ghost" asChild className="w-full font-bold h-11">
              <Link href="/settings?tab=billing">View Plans</Link>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
