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
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">{label}</span>
        {showValue && (
          <span className={cn(
            isHigh ? "text-destructive" : isWarning ? "text-orange-500" : "text-foreground"
          )}>
            {value.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-2 relative w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full w-full flex-1 transition-all duration-500",
            isHigh ? "bg-destructive" : isWarning ? "bg-orange-500" : "bg-primary"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </div>
    </div>
  );
}
