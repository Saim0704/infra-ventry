import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UsageBarProps {
  value: number; // 0 to 100
  label: string;
  className?: string;
  showValue?: boolean;
}

export function UsageBar({ value, label, className, showValue = true }: UsageBarProps) {
  const isHigh = value > 90;
  const isWarning = value > 75;

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">{label}</span>
        {showValue && (
          <span className={cn(
            "text-[11px] font-mono font-bold",
            isHigh ? "text-destructive" : isWarning ? "text-orange-500" : "text-primary/90"
          )}>
            {value.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-1.5 relative w-full overflow-hidden rounded-full bg-secondary/30 border border-border/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
        <div
          className={cn(
            "h-full w-full flex-1 transition-all duration-700 ease-in-out border-r border-black/10",
            isHigh ? "bg-gradient-to-r from-destructive/90 to-destructive" :
              isWarning ? "bg-gradient-to-r from-orange-400 to-orange-500" :
                "bg-gradient-to-r from-primary/80 to-primary"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </div>
    </div>
  );
}
