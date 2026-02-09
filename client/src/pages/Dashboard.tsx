import { useDashboardStats } from "@/hooks/use-dashboard";
import { Shell } from "@/components/layout/Shell";
import { MetricCard } from "@/components/ui/MetricCard";
import { Server, Database, Cloud, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
            <MetricCard
              title="Total Servers"
              value={stats?.totalServers || 0}
              icon={Server}
              description={`${stats?.healthyServers || 0} Healthy`}
            />
            <MetricCard
              title="Total Databases"
              value={stats?.totalDatabases || 0}
              icon={Database}
              description="Active instances"
            />
            <MetricCard
              title="Kubernetes Clusters"
              value={stats?.totalClusters || 0}
              icon={Cloud}
              description="Managed clusters"
            />
            <MetricCard
              title="Critical Alerts"
              value={stats?.criticalServers || 0}
              icon={AlertTriangle}
              className={stats?.criticalServers ? "border-destructive/50 bg-destructive/5" : ""}
              description="Servers requiring attention"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border">
              Detailed system-wide aggregation chart coming soon...
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer group">
              <h4 className="font-semibold text-primary group-hover:underline">Add New Agent</h4>
              <p className="text-sm text-muted-foreground mt-1">Generate a token to connect a new server or cluster.</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors cursor-pointer">
              <h4 className="font-semibold">View Alerts</h4>
              <p className="text-sm text-muted-foreground mt-1">Check system notifications and warnings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
