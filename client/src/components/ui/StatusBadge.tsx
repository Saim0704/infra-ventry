import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  lastSeen?: string | Date | null;
  thresholdMinutes?: number;
}

export function StatusBadge({ lastSeen, thresholdMinutes = 5 }: StatusBadgeProps) {
  if (!lastSeen) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        Unknown
      </span>
    );
  }

  const lastSeenDate = new Date(lastSeen);
  const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / 1000 / 60;
  const isOnline = diffMinutes < thresholdMinutes;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors shadow-sm",
        isOnline
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
