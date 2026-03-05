import { useDatabase } from "@/hooks/use-databases";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, Network } from "lucide-react";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { DatabaseMetric } from "@shared/schema";

interface DatabaseDetailViewProps {
    id: number | null;
}

export function DatabaseDetailView({ id }: DatabaseDetailViewProps) {
    const { data: db, isLoading } = useDatabase(id);

    if (isLoading) return <div className="h-64 flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;
    if (!db) return null;

    const chartData = (db.metrics as DatabaseMetric[]).slice(-20).map(m => ({
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
