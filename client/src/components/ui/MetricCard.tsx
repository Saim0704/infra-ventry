import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, description, className }: MetricCardProps) {
  return (
    <Card className={cn(
      "hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 border-border/30 bg-card/40 backdrop-blur-md relative overflow-hidden group/card",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/card:bg-primary/10 transition-colors duration-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
          {title}
        </CardTitle>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover/card:scale-110 transition-transform duration-300">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-black font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
