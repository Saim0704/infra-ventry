import { useDatabases, useDatabase } from "@/hooks/use-databases";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Database, HardDrive, Network } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export default function DatabasesPage() {
  const { data: databases, isLoading } = useDatabases();
  const [selectedDbId, setSelectedDbId] = useState<number | null>(null);

  return (
    <Shell title="Databases" description="Monitor database instances, storage, and active connections.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : (
          databases?.map((db) => (
            <Dialog key={db.id} onOpenChange={(open) => setSelectedDbId(open ? db.id : null)}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-xl hover:border-accent/50 transition-all duration-300 group overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent/0 group-hover:bg-accent transition-all duration-300" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-accent transition-colors">
                          <Database className="h-4 w-4" />
                          {db.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {db.engine} {db.version}
                        </CardDescription>
                      </div>
                      <StatusBadge lastSeen={db.lastSeen} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Host</span>
                      <span className="font-mono">{db.host}:{db.port}</span>
                    </div>
                    {/* Placeholder metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Storage</div>
                        <div className="font-bold text-lg">{(Math.random() * 100).toFixed(1)} GB</div>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground mb-1">Connections</div>
                        <div className="font-bold text-lg">{Math.floor(Math.random() * 50)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display flex items-center gap-2">
                    <Database className="h-6 w-6 text-accent" />
                    {db.name} Details
                  </DialogTitle>
                </DialogHeader>
                <DatabaseDetailView id={selectedDbId} />
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
      {!isLoading && databases?.length === 0 && (
        <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No databases connected</h3>
          <p className="text-muted-foreground mt-2">Deploy a DB agent to start monitoring.</p>
        </div>
      )}
    </Shell>
  );
}

function DatabaseDetailView({ id }: { id: number | null }) {
  const { data: db, isLoading } = useDatabase(id);

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
  if (!db) return null;

  const chartData = db.metrics.slice(-20).map(m => ({
    time: format(new Date(m.createdAt || new Date()), "HH:mm"),
    connections: m.activeConnections,
    storage: m.storageUsed
  }));

  return (
    <div className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <div className="text-3xl font-bold font-display">{db.metrics[0]?.storageUsed?.toFixed(2) ?? 0} GB</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Network className="h-4 w-4" />
              <span className="text-sm font-medium">Active Connections</span>
            </div>
            <div className="text-3xl font-bold font-display">{db.metrics[0]?.activeConnections ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Connection History</h3>
        <div className="h-[300px] w-full bg-card border border-border rounded-xl p-4 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                cursor={{ fill: 'hsl(var(--secondary))' }}
              />
              <Bar dataKey="connections" name="Connections" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
