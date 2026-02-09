import { useClusters, useCluster } from "@/hooks/use-clusters";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Cloud, Box, Cpu } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters();
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

  return (
    <Shell title="Kubernetes Clusters" description="Overview of your K8s clusters, nodes, and pod usage.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : (
          clusters?.map((cluster) => (
            <Dialog key={cluster.id} onOpenChange={(open) => setSelectedClusterId(open ? cluster.id : null)}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-400/0 group-hover:bg-blue-400 transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                          <Cloud className="h-4 w-4" />
                          {cluster.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {cluster.version}
                        </CardDescription>
                      </div>
                      <StatusBadge lastSeen={cluster.lastSeen} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/30 p-3 rounded-lg flex flex-col items-center">
                        <span className="text-xs text-muted-foreground mb-1">Nodes</span>
                        <span className="font-bold text-xl">{cluster.nodeCount}</span>
                      </div>
                      <div className="bg-secondary/30 p-3 rounded-lg flex flex-col items-center">
                        <span className="text-xs text-muted-foreground mb-1">Total CPU</span>
                        <span className="font-bold text-xl">{cluster.totalCpu}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display flex items-center gap-2">
                    <Cloud className="h-6 w-6 text-blue-500" />
                    {cluster.name} Details
                  </DialogTitle>
                </DialogHeader>
                <ClusterDetailView id={selectedClusterId} />
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
      {!isLoading && clusters?.length === 0 && (
         <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border">
          <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No clusters connected</h3>
          <p className="text-muted-foreground mt-2">Deploy a K8s agent to start monitoring.</p>
        </div>
      )}
    </Shell>
  );
}

function ClusterDetailView({ id }: { id: number | null }) {
  const { data: cluster, isLoading } = useCluster(id);

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
  if (!cluster) return null;

  const chartData = cluster.metrics.slice(-20).map(m => ({
    time: format(new Date(m.createdAt || new Date()), "HH:mm"),
    cpu: m.cpuUsage,
    memory: m.memoryUsage,
    pods: m.podCount
  }));

  return (
    <div className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Box className="h-4 w-4" />
              <span className="text-sm font-medium">Active Pods</span>
            </div>
            <div className="text-3xl font-bold font-display">{cluster.metrics[0]?.podCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Cpu className="h-4 w-4" />
              <span className="text-sm font-medium">Cluster CPU %</span>
            </div>
            <div className="text-3xl font-bold font-display">{cluster.metrics[0]?.cpuUsage?.toFixed(1) ?? 0}%</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
            <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Cloud className="h-4 w-4" />
              <span className="text-sm font-medium">Nodes</span>
            </div>
            <div className="text-3xl font-bold font-display">{cluster.nodeCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Resource Utilization</h3>
        <div className="h-[300px] w-full bg-card border border-border rounded-xl p-4 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpuCluster" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpuCluster)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
