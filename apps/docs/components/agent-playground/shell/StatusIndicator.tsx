import type { ConnectionState } from "@/components/agent-playground/augment/events";

export function StatusIndicator({
  connectionState,
  isRunning,
}: {
  connectionState: ConnectionState;
  isRunning: boolean;
}) {
  const color =
    connectionState === "open"
      ? "bg-emerald-400"
      : connectionState === "error"
        ? "bg-red-400"
        : "bg-amber-400";
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{isRunning ? "running" : connectionState}</span>
    </div>
  );
}
