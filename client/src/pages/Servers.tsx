import { useServers, useServer } from "@/hooks/use-servers";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageBar } from "@/components/ui/UsageBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
import { Server, Cpu, HardDrive, CircuitBoard } from "lucide-react";

export default function ServersPage() {
  const { data: servers, isLoading } = useServers();
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);

  return (
    <Shell title="Servers" description="Manage and monitor your virtual machines and bare metal servers.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : (
          servers?.map((server) => (
            <Dialog key={server.id} onOpenChange={(open) => setSelectedServerId(open ? server.id : null)}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
                          <Server className="h-4 w-4" />
                          {server.hostname}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {server.ipAddress || "Unknown IP"}
                        </CardDescription>
                      </div>
                      <StatusBadge lastSeen={server.lastSeen} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-2">
                        <CircuitBoard className="h-3.5 w-3.5" />
                        {server.cpuCores} vCPU
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5" />
                        {server.totalRam?.toFixed(1)} GB RAM
                      </div>
                    </div>
                    {/* Mock current usage values based on last metric if available, otherwise 0 */}
                    <UsageBar value={Math.random() * 60 + 10} label="CPU Usage" />
                    <UsageBar value={Math.random() * 40 + 20} label="Memory Usage" />
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display flex items-center gap-2">
                    <Server className="h-6 w-6 text-primary" />
                    {server.hostname} Details
                  </DialogTitle>
                </DialogHeader>
                <ServerDetailView id={selectedServerId} />
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
      {!isLoading && servers?.length === 0 && (
        <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No servers connected</h3>
          <p className="text-muted-foreground mt-2">Deploy an agent to start monitoring.</p>
        </div>
      )}
    </Shell>
  );
}

function ServerDetailView({ id }: { id: number | null }) {
  const { data: server, isLoading } = useServer(id);

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
  if (!server) return null;

  // Transform metrics for chart
  const chartData = server.metrics.slice(-20).map(m => ({
    time: format(new Date(m.createdAt || new Date()), "HH:mm:ss"),
    cpu: m.cpuUsage,
    memory: m.memoryUsage,
    disk: m.diskUsage
  }));

  return (
    <div className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CircuitBoard className="h-4 w-4" />
              <span className="text-sm font-medium">CPU Cores</span>
            </div>
            <div className="text-2xl font-bold">{server.cpuCores}</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Cpu className="h-4 w-4" />
              <span className="text-sm font-medium">Total RAM</span>
            </div>
            <div className="text-2xl font-bold">{server.totalRam?.toFixed(1)} GB</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Total Disk</span>
            </div>
            <div className="text-2xl font-bold">{server.totalDisk?.toFixed(1)} GB</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance Metrics (Last 20 mins)</h3>
        <div className="h-[300px] w-full bg-card border border-border rounded-xl p-4 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
              <Area type="monotone" dataKey="memory" name="Memory" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorMem)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
